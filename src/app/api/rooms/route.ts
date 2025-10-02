// ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ API БЕЗ ДУБЛИКАТОВ
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { checkRateLimit, getRateLimitId } from '../../../lib/ratelimit';
import { getUserIdFromRequest, requireAuth } from '../../../lib/auth-utils';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/rooms - Получить список комнат
export async function GET(req: NextRequest) {
  console.log('🔍 GET /api/rooms - загружаем комнаты');
  
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'public';
    
    let query = supabase
      .from('_pidr_rooms')
      .select(`
        id, 
        room_code, 
        name, 
        max_players, 
        current_players, 
        status, 
        is_private, 
        created_at,
        _pidr_users!_pidr_rooms_host_id_fkey (
          username, 
          first_name,
          avatar_url
        ),
        _pidr_room_players (
          user_id,
          position,
          is_ready,
          username,
          _pidr_users (
            username,
            first_name
          )
        )
      `);

    if (type === 'joinable') {
      query = query
        .eq('status', 'waiting')
        .eq('is_private', false)
        .lt('current_players', 'max_players');
    } else if (type === 'playing') {
      query = query.eq('status', 'playing');
    } else {
      query = query
        .eq('is_private', false)
        .in('status', ['waiting', 'playing']);
    }

    const { data: rooms, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Ошибка загрузки комнат:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка загрузки комнат: ' + error.message 
      }, { status: 500 });
    }

    // Преобразуем данные для фронтенда с актуальным подсчетом игроков
    const formattedRooms = (rooms || []).map((room: any) => {
      const actualPlayerCount = room._pidr_room_players?.length || 0;
      
      return {
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        max_players: room.max_players,
        current_players: actualPlayerCount, // Актуальное количество из БД
        status: room.status,
        is_private: room.is_private,
        created_at: room.created_at,
        users: room._pidr_users ? {
          username: room._pidr_users.username || room._pidr_users.first_name || 'Хост',
          avatar: room._pidr_users.avatar_url || null
        } : null,
        players: room._pidr_room_players?.map((player: any) => ({
          userId: player.user_id,
          position: player.position,
          isReady: player.is_ready,
          username: player.username || player._pidr_users?.username || player._pidr_users?.first_name || 'Игрок'
        })) || []
      };
    });

    return NextResponse.json({ 
      success: true, 
      rooms: formattedRooms
    });

  } catch (error) {
    console.error('❌ Rooms GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

// POST /api/rooms - Создание и присоединение к комнатам
export async function POST(req: NextRequest) {
  console.log('🏠 POST /api/rooms - Обработка запроса...');

  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }

  const userId = auth.userId as string;

  try {
    const body = await req.json();
    const { action, name, maxPlayers, gameMode, hasPassword, password, isPrivate, roomCode } = body;

    console.log('📋 Данные запроса:', { action, name, maxPlayers, gameMode, roomCode });

    if (action === 'create') {
      console.log('🆕 Создание новой комнаты...');

      // Проверяем, не создал ли пользователь уже комнату
      const { data: existingRoom } = await supabase
        .from('_pidr_rooms')
        .select('id, name, room_code')
        .eq('host_id', userId)
        .in('status', ['waiting', 'playing'])
        .single();

      if (existingRoom) {
        return NextResponse.json({ 
          success: false, 
          message: `У вас уже есть активная комната "${existingRoom.name}". Закройте её или покиньте сначала.` 
        }, { status: 400 });
      }

      // Создаем комнату
      const roomCode = generateRoomCode();
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .insert({
          room_code: roomCode,
          name: name || 'Новая комната',
          host_id: userId,
          max_players: maxPlayers || 6,
          current_players: 0, // Начинаем с 0, добавим хоста отдельно
          status: 'waiting',
          is_private: isPrivate || false,
          password: hasPassword ? password : null,
          game_mode: gameMode || 'casual',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roomError) {
        console.error('❌ Ошибка создания комнаты:', roomError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания комнаты' 
        }, { status: 500 });
      }

      // Получаем данные пользователя
      const { data: userData } = await supabase
        .from('_pidr_users')
        .select('username, first_name')
        .eq('id', userId)
        .single();

      const username = userData?.username || userData?.first_name || 'Хост';

      // Добавляем хоста как первого игрока
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: username,
          position: 0,
          is_ready: true
        });

      if (playerError) {
        console.error('❌ Ошибка добавления хоста:', playerError);
        // Удаляем комнату если не удалось добавить хоста
        await supabase.from('_pidr_rooms').delete().eq('id', room.id);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания комнаты' 
        }, { status: 500 });
      }

      // Обновляем счетчик игроков
      await supabase
        .from('_pidr_rooms')
        .update({ current_players: 1 })
        .eq('id', room.id);

      console.log('✅ Комната создана:', roomCode);
      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode,
          name: room.name,
          status: room.status
        }
      });
    }

    if (action === 'join') {
      console.log('🚪 Присоединение к комнате:', roomCode);

      if (!roomCode) {
        return NextResponse.json({ success: false, message: 'Код комнаты обязателен' }, { status: 400 });
      }

      // Находим комнату
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .select('id, name, max_players, current_players, status, is_private, password, host_id')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (roomError || !room) {
        return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
      }

      if (room.status !== 'waiting') {
        return NextResponse.json({ success: false, message: 'Комната недоступна' }, { status: 400 });
      }

      // 🔥 КРИТИЧЕСКОЕ: Проверяем дубликаты ДО любых действий
      const { data: existingPlayer } = await supabase
        .from('_pidr_room_players')
        .select('id, position, is_ready')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single();

      if (existingPlayer) {
        console.log('⚠️ Игрок уже в комнате, обновляем ready');
        
        await supabase
          .from('_pidr_room_players')
          .update({ is_ready: true })
          .eq('id', existingPlayer.id);
          
        return NextResponse.json({ 
          success: true, 
          room: {
            id: room.id,
            roomCode,
            name: room.name,
            position: existingPlayer.position
          },
          message: room.host_id === userId ? 'С возвращением, хост! 👑' : 'Добро пожаловать обратно!'
        });
      }

      // Проверяем пароль
      if (room.is_private && room.password && password !== room.password) {
        return NextResponse.json({ success: false, message: 'Неверный пароль' }, { status: 403 });
      }

      // Проверяем свободные места
      const { data: currentPlayers } = await supabase
        .from('_pidr_room_players')
        .select('id, position')
        .eq('room_id', room.id);

      const actualPlayerCount = currentPlayers?.length || 0;
      
      if (actualPlayerCount >= room.max_players) {
        return NextResponse.json({ success: false, message: 'Комната заполнена' }, { status: 400 });
      }

      // Находим свободную позицию
      const occupied = currentPlayers?.map((p: any) => p.position) || [];
      let freePosition = 0;
      for (let i = 0; i < room.max_players; i++) {
        if (!occupied.includes(i)) {
          freePosition = i;
          break;
        }
      }

      // Получаем данные пользователя
      const { data: userData } = await supabase
        .from('_pidr_users')
        .select('username, first_name')
        .eq('id', userId)
        .single();

      const username = userData?.username || userData?.first_name || 'Игрок';

      // Добавляем игрока
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: username,
          position: freePosition,
          is_ready: false
        });

      if (playerError) {
        console.error('❌ Ошибка добавления игрока:', playerError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка присоединения' 
        }, { status: 500 });
      }

      // Обновляем счетчик игроков
      await supabase
        .from('_pidr_rooms')
        .update({ current_players: actualPlayerCount + 1 })
        .eq('id', room.id);

      console.log('✅ Игрок присоединился к комнате');
      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode,
          name: room.name,
          position: freePosition
        }
      });
    }

    return NextResponse.json({ success: false, message: 'Неизвестное действие' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Rooms POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// DELETE /api/rooms - Выход из комнаты
export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }

  const userId = auth.userId as string;

  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const action = searchParams.get('action');

    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
    }

    // Удаляем игрока из комнаты
    const { error: leaveError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (leaveError) {
      console.error('❌ Ошибка выхода из комнаты:', leaveError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка выхода из комнаты' 
      }, { status: 500 });
    }

    // Обновляем счетчик игроков
    const { data: remainingPlayers } = await supabase
      .from('_pidr_room_players')
      .select('id')
      .eq('room_id', roomId);

    const remainingCount = remainingPlayers?.length || 0;

    if (remainingCount === 0) {
      // Удаляем пустую комнату
      await supabase
        .from('_pidr_rooms')
        .delete()
        .eq('id', roomId);
    } else {
      // Обновляем счетчик
      await supabase
        .from('_pidr_rooms')
        .update({ current_players: remainingCount })
        .eq('id', roomId);
    }

    return NextResponse.json({ success: true, message: 'Вышли из комнаты' });

  } catch (error: any) {
    console.error('❌ Rooms DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
