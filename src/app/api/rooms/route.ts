// МИНИМАЛЬНЫЙ API БЕЗ ВСЕХ СЛОЖНОСТЕЙ - ТОЛЬКО РАБОТАЮЩИЙ КОД
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth-utils';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/rooms - ПРОСТЕЙШИЙ ЗАПРОС
export async function GET(req: NextRequest) {
  console.log('🔍 GET /api/rooms - загружаем комнаты');
  
  try {
    // ПРОСТЕЙШИЙ ЗАПРОС БЕЗ ДЖОЙНОВ
    const { data: rooms, error } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('is_private', false)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Ошибка загрузки комнат:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка загрузки комнат: ' + error.message 
      }, { status: 500 });
    }

    console.log('✅ Загружено комнат:', rooms?.length || 0);

    // ПРОСТЕЙШИЙ ФОРМАТ
    const formattedRooms = (rooms || []).map((room: any) => ({
      id: room.id,
      room_code: room.room_code,
      name: room.name,
      max_players: room.max_players,
      current_players: room.current_players,
      status: room.status,
      is_private: room.is_private,
      created_at: room.created_at,
      users: { username: 'Хост', avatar: null },
      players: []
    }));

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

// POST /api/rooms - ПРОСТЕЙШЕЕ СОЗДАНИЕ
export async function POST(req: NextRequest) {
  console.log('🏠 POST /api/rooms - создание комнаты');

  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;
    const body = await req.json();
    const { action, name, maxPlayers, gameMode, hasPassword, password, isPrivate } = body;

    console.log('📋 Данные запроса:', { action, name, maxPlayers, gameMode });

    if (action === 'create') {
      console.log('🆕 Создание новой комнаты...');

      // ПРОСТЕЙШАЯ ПРОВЕРКА
      const { data: existingRoom } = await supabase
        .from('_pidr_rooms')
        .select('id, name')
        .eq('host_id', userId)
        .eq('status', 'waiting')
        .single();

      if (existingRoom) {
        return NextResponse.json({ 
          success: false, 
          message: `У вас уже есть активная комната "${existingRoom.name}". Закройте её сначала.` 
        }, { status: 400 });
      }

      // СОЗДАЕМ КОМНАТУ БЕЗ ЛИШНИХ ПОЛЕЙ
      const roomCode = generateRoomCode();
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .insert({
          room_code: roomCode,
          name: name || 'Новая комната',
          host_id: userId,
          max_players: maxPlayers || 6,
          current_players: 0, // Начинаем с 0, потом добавим хоста
          status: 'waiting',
          is_private: isPrivate || false,
          password: hasPassword ? password : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roomError) {
        console.error('❌ Ошибка создания комнаты:', roomError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания комнаты: ' + roomError.message 
        }, { status: 500 });
      }

      // ДОБАВЛЯЕМ ХОСТА И ОБНОВЛЯЕМ СЧЕТЧИК
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: 'Хост',
          position: 0,
          is_ready: true
        });

      if (playerError) {
        console.error('❌ Ошибка добавления хоста:', playerError);
        // Удаляем комнату если не удалось добавить хоста
        await supabase.from('_pidr_rooms').delete().eq('id', room.id);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания комнаты: ' + playerError.message 
        }, { status: 500 });
      }

      // ОБНОВЛЯЕМ СЧЕТЧИК ИГРОКОВ
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
      // ПРОСТЕЙШЕЕ ПРИСОЕДИНЕНИЕ
      const { roomCode } = body;
      
      if (!roomCode) {
        return NextResponse.json({ success: false, message: 'Код комнаты обязателен' }, { status: 400 });
      }

      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .select('*')
        .eq('room_code', (roomCode || '').toUpperCase())
        .single();

      if (roomError || !room) {
        return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
      }

      // ДОБАВЛЯЕМ ИГРОКА БЕЗ ПРОВЕРОК ДУБЛИКАТОВ
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: 'Игрок',
          position: room.current_players,
          is_ready: false
        });

      if (playerError) {
        console.error('❌ Ошибка добавления игрока:', playerError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка присоединения: ' + playerError.message 
        }, { status: 500 });
      }

      // ОБНОВЛЯЕМ СЧЕТЧИК
      await supabase
        .from('_pidr_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', room.id);

      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode,
          name: room.name,
          position: room.current_players
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

// DELETE - ПРОСТЕЙШИЙ ВЫХОД
export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
    }

    // УДАЛЯЕМ ИГРОКА
    await supabase
      .from('_pidr_room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    return NextResponse.json({ success: true, message: 'Вышли из комнаты' });

  } catch (error: any) {
    console.error('❌ Rooms DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
