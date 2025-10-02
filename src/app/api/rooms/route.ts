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
  console.log('🔍 GET /api/rooms - загружаем реальные комнаты');
  
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'public';
    
    console.log('📋 Тип запроса комнат:', type);

    // Проверяем подключение к Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Supabase не настроен, возвращаем пустой список');
      return NextResponse.json({ 
        success: true, 
        rooms: [],
        message: 'Supabase не настроен'
      });
    }

    // Загружаем реальные комнаты из базы данных с подсчетом игроков
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
          photo_url
        ),
        _pidr_room_players (
          user_id,
          position,
          is_ready,
          _pidr_users (
            username,
            first_name
          )
        )
      `);

    // Фильтры в зависимости от типа
    if (type === 'joinable') {
      query = query
        .eq('status', 'waiting')
        .eq('is_private', false)
        .lt('current_players', 'max_players');
    } else if (type === 'playing') {
      query = query.eq('status', 'playing');
    } else {
      // public - все публичные комнаты
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

    console.log(`✅ Загружено ${rooms?.length || 0} комнат`);

    // Преобразуем данные для фронтенда с реальным подсчетом игроков
    const formattedRooms = (rooms || []).map((room: any) => {
      // Реальное количество игроков из таблицы _pidr_room_players
      const actualPlayerCount = room._pidr_room_players?.length || 0;
      
      console.log(`🎮 Комната ${room.room_code}: ${actualPlayerCount} игроков (было ${room.current_players})`);

      return {
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        max_players: room.max_players,
        current_players: actualPlayerCount, // Используем реальное количество
        status: room.status,
        is_private: room.is_private,
        created_at: room.created_at,
        users: room._pidr_users ? {
          username: room._pidr_users.username || room._pidr_users.first_name || 'Игрок',
          avatar: room._pidr_users.photo_url || null
        } : null,
        players: room._pidr_room_players?.map((player: any) => ({
          userId: player.user_id,
          position: player.position,
          isReady: player.is_ready,
          username: player._pidr_users?.username || player._pidr_users?.first_name || 'Игрок'
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
      message: 'Ошибка сервера: ' + (error as Error).message
    }, { status: 500 });
  }
}

// Original authenticated function (renamed to avoid conflicts)
async function getAuthenticatedRooms(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'public'; // public, my, joinable

    if (type === 'my') {
      // Получаем комнаты пользователя (где он хост или участник)
      const { data: rooms, error } = await supabase
        .from('_pidr_rooms')
        .select(`
          id, room_code, name, max_players, current_players, status, is_private, created_at,
          _pidr_users!_pidr_rooms_host_id_fkey (username, avatar),
          _pidr_room_players (
            user_id, position, is_ready,
            _pidr_users (username, avatar)
          )
        `)
        .or(`host_id.eq.${userId},id.in.(${await getUserRoomIds(userId)})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ success: true, rooms: rooms || [] });
    }

    if (type === 'joinable') {
      // Получаем комнаты к которым можно присоединиться
      const { data: rooms, error } = await supabase
        .from('_pidr_rooms')
        .select(`
          id, room_code, name, max_players, current_players, status, is_private, created_at,
          _pidr_users!_pidr_rooms_host_id_fkey (username, avatar)
        `)
        .eq('status', 'waiting')
        .eq('is_private', false)
        .lt('current_players', 9) // Максимум 9 игроков
        .neq('host_id', userId) // Не показываем свои комнаты
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return NextResponse.json({ success: true, rooms: rooms || [] });
    }

    // Получаем публичные комнаты (type === 'public')
    const { data: rooms, error } = await supabase
      .from('_pidr_rooms')
      .select(`
        id, room_code, name, max_players, current_players, status, created_at,
        _pidr_users!_pidr_rooms_host_id_fkey (username, avatar)
      `)
      .eq('is_private', false)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, rooms: rooms || [] });

  } catch (error) {
    console.error('Rooms GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rooms - Создать комнату или присоединиться к комнате
export async function POST(req: NextRequest) {
  console.log('🏠 POST /api/rooms - Обработка запроса...');
  
  try {
    // ✅ ИСПРАВЛЕНО: Более детальная проверка авторизации
    const auth = requireAuth(req);
    if (auth.error) {
      console.error('❌ Ошибка авторизации:', auth.error);
      return NextResponse.json({ success: false, message: `Ошибка авторизации: ${auth.error}` }, { status: 401 });
    }
    
    // После проверки auth.error, userId гарантированно существует
    const userId = auth.userId as string;
    console.log('👤 Пользователь авторизован:', userId);

    // ✅ ПРОВЕРЯЕМ ПОДКЛЮЧЕНИЕ К SUPABASE
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase не настроен');
      return NextResponse.json({ 
        success: false, 
        message: 'Сервис временно недоступен. Попробуйте позже.' 
      }, { status: 503 });
    }

    // Rate limiting (временно отключено для диагностики)
    try {
      const id = getRateLimitId(req);
      const { success } = await checkRateLimit(`rooms:${id}`);
      if (!success) {
        console.warn('⚠️ Rate limit exceeded, but allowing request');
        // return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
      }
    } catch (rateLimitError) {
      console.warn('⚠️ Rate limit check failed:', rateLimitError);
      // Продолжаем без rate limiting
    }

    const { action, roomCode, roomName, maxPlayers, isPrivate, password } = await req.json();
    console.log('📝 Данные запроса:', { action, roomCode, roomName, maxPlayers, isPrivate });

    // ✅ ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ ПОЛЬЗОВАТЕЛЯ В БАЗЕ
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, username, telegram_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден в базе:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден. Попробуйте перезайти в приложение.' 
      }, { status: 404 });
    }

    console.log('✅ Пользователь найден:', user.username || user.telegram_id);

    if (action === 'create') {
      // Создание новой комнаты
      let uniqueCode = '';
      let attempts = 0;
      
      // Генерируем уникальный код комнаты
      do {
        uniqueCode = generateRoomCode();
        attempts++;
        if (attempts > 10) throw new Error('Failed to generate unique room code');
        
        const { data: existing } = await supabase
          .from('_pidr_rooms')
          .select('id')
          .eq('room_code', uniqueCode)
          .single();
          
        if (!existing) break;
      } while (true);

      // Проверяем, нет ли у пользователя активной комнаты как хоста
      console.log('🔍 Проверяем существующие комнаты хоста...');
      const { data: existingHostRoom, error: hostRoomError } = await supabase
        .from('_pidr_rooms')
        .select('id, name')
        .eq('host_id', userId)
        .in('status', ['waiting', 'playing'])
        .single();

      if (hostRoomError && hostRoomError.code !== 'PGRST116') {
        console.error('❌ Ошибка проверки комнат хоста:', hostRoomError);
        throw new Error(`Database error: ${hostRoomError.message}`);
      }

      if (existingHostRoom) {
        return NextResponse.json({ 
          success: false, 
          message: `У вас уже есть активная комната "${existingHostRoom.name}". Закройте её или покиньте сначала.` 
        }, { status: 400 });
      }

      // ✅ ИСПРАВЛЕНО: Более точная проверка участия в других комнатах
      console.log('🔍 Проверяем участие пользователя в других комнатах...');
      
      const { data: existingParticipation, error: participationError } = await supabase
        .from('_pidr_room_players')
        .select(`
          id,
          room_id,
          position,
          is_ready,
          _pidr_rooms!inner(
            id,
            name,
            status,
            room_code
          )
        `)
        .eq('user_id', userId)
        .in('_pidr_rooms.status', ['waiting', 'playing']);

      if (participationError) {
        console.error('❌ Ошибка проверки участия:', participationError);
      }

      if (existingParticipation && existingParticipation.length > 0) {
        const activeRooms = existingParticipation.map((p: any) => ({
          name: p._pidr_rooms?.name || 'Неизвестная комната',
          code: p._pidr_rooms?.room_code || 'UNKNOWN',
          status: p._pidr_rooms?.status || 'unknown'
        }));
        
        console.log('⚠️ Пользователь уже участвует в комнатах:', activeRooms);
        
        return NextResponse.json({ 
          success: false, 
          message: `Вы уже участвуете в комнате "${activeRooms[0].name}" (${activeRooms[0].code}). Покиньте её сначала.`,
          activeRooms
        }, { status: 400 });
      }
      
      console.log('✅ Пользователь не участвует в других комнатах');

      // Создаем комнату
      console.log('🏗️ Создаем новую комнату:', {
        room_code: uniqueCode,
        name: roomName || 'P.I.D.R. Игра',
        host_id: userId,
        max_players: Math.min(Math.max(maxPlayers || 4, 2), 9),
        is_private: isPrivate || false
      });

      // ИСПРАВЛЕНО: Убираем game_settings до применения миграции в Supabase
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .insert({
          room_code: uniqueCode,
          name: roomName || 'P.I.D.R. Игра',
          host_id: userId,
          max_players: Math.min(Math.max(maxPlayers || 4, 2), 9),
          current_players: 1,
          is_private: isPrivate || false,
          password: password || null
          // game_settings временно убрано - нужно применить миграцию в Supabase Dashboard
        })
        .select()
        .single();

      if (roomError) {
        console.error('❌ Ошибка создания комнаты в БД:', roomError);
        throw roomError;
      }

      console.log('✅ Комната создана:', room.id, room.room_code);

      // Получаем данные пользователя для добавления в комнату
      console.log('👤 Получаем данные пользователя:', userId);
      const { data: userData, error: userError } = await supabase
        .from('_pidr_users')
        .select('username, first_name')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('❌ Ошибка получения данных пользователя:', userError);
        throw new Error('Пользователь не найден');
      }

      const username = userData.username || userData.first_name || 'Игрок';
      console.log('👤 Имя пользователя:', username);

      // Добавляем хоста как первого игрока
      console.log('👤 Добавляем хоста в комнату:', { room_id: room.id, user_id: userId, username });
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: username, // ИСПРАВЛЕНО: добавляем username
          position: 0,
          is_ready: true
        });

      if (playerError) {
        console.error('❌ Ошибка добавления хоста в комнату:', playerError);
        throw playerError;
      }

      console.log('✅ Хост добавлен в комнату');

      // Обновляем статус пользователя
      try {
        console.log('📊 Обновляем статус пользователя...');
        if (room?.id && userId) {
          await updateUserStatus(userId, 'in_game', room.id.toString());
          console.log('✅ Статус пользователя обновлен');
        }
      } catch (statusError) {
        console.warn('⚠️ Не удалось обновить статус пользователя (не критично):', statusError);
        // Не прерываем процесс, если обновление статуса не удалось
      }

      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          status: room.status
        }
      });
    }

    if (action === 'join') {
      // Присоединение к комнате
      if (!roomCode) {
        return NextResponse.json({ success: false, message: 'Room code required' }, { status: 400 });
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
        return NextResponse.json({ success: false, message: 'Комната недоступна для присоединения' }, { status: 400 });
      }

      // ИСПРАВЛЕНО: Особая проверка для хоста - хост всегда может войти в свою комнату
      if (room.host_id === userId) {
        console.log('👑 Хост заходит в свою комнату:', roomCode);
        
        // Проверяем, не находится ли хост уже в комнате
        const { data: existingPlayer } = await supabase
          .from('_pidr_room_players')
          .select('id, position, is_ready')
          .eq('room_id', room.id)
          .eq('user_id', userId)
          .single();

        if (existingPlayer) {
          console.log('👑 Хост уже в комнате, просто восстанавливаем статус ready');
          
          // Хост уже есть - просто обновляем статус на ready
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
            message: 'С возвращением, хост! 👑'
          });
        }

        // ИСПРАВЛЕНО: Хоста НЕТ в списке игроков - добавляем его правильно
        console.log('👑 Добавляем хоста в комнату впервые');
        
        // Получаем данные пользователя
        const { data: userData, error: userError } = await supabase
          .from('_pidr_users')
          .select('username, first_name')
          .eq('id', userId)
          .single();

        const username = userData?.username || userData?.first_name || 'Игрок';
        
        const { error: hostJoinError } = await supabase
          .from('_pidr_room_players')
          .insert({
            room_id: room.id,
            user_id: userId,
            username: username, // ИСПРАВЛЕНО: добавляем username
            position: 0, // Хост всегда на позиции 0
            is_ready: true
          });

        if (hostJoinError) {
          console.error('❌ Ошибка добавления хоста в комнату:', hostJoinError);
          return NextResponse.json({ 
            success: false, 
            message: 'Ошибка добавления в комнату' 
          }, { status: 500 });
        }

        // ИСПРАВЛЕНО: Получаем актуальный счет игроков из базы
        const { data: allPlayers } = await supabase
          .from('_pidr_room_players')
          .select('id')
          .eq('room_id', room.id);

        const actualPlayerCount = allPlayers?.length || 1;
        console.log(`📊 Хост добавлен, обновляем счетчик на ${actualPlayerCount}`);
        
        await supabase
          .from('_pidr_rooms')
          .update({ current_players: actualPlayerCount })
          .eq('id', room.id);

        return NextResponse.json({ 
          success: true, 
          room: {
            id: room.id,
            roomCode,
            name: room.name,
            position: 0
          },
          message: 'Добро пожаловать в вашу комнату, хост! 👑'
        });
      }

      // Для обычных игроков проверяем заполненность
      if (room.current_players >= room.max_players) {
        return NextResponse.json({ success: false, message: 'Комната заполнена' }, { status: 400 });
      }

      // Проверяем пароль для приватных комнат
      if (room.is_private && room.password && room.password !== password) {
        return NextResponse.json({ success: false, message: 'Неверный пароль' }, { status: 403 });
      }

      // Проверяем, не участвует ли пользователь в любой активной комнате
      const { data: userInAnyRoom } = await supabase
        .from('_pidr_room_players')
        .select(`
          id,
          room_id,
          _pidr_rooms (
            id, name, status
          )
        `)
        .eq('user_id', userId);

      // Удаляем пользователя из всех неактивных комнат
      if (userInAnyRoom && userInAnyRoom.length > 0) {
        for (const playerRecord of userInAnyRoom) {
          const roomData = playerRecord._pidr_rooms as any;
          
          if (roomData.status === 'waiting' || roomData.status === 'playing') {
            if (roomData.id === room.id) {
              return NextResponse.json({ 
                success: false, 
                message: 'Вы уже в этой комнате' 
              }, { status: 400 });
            } else {
              return NextResponse.json({ 
                success: false, 
                message: `Вы уже участвуете в другой комнате "${roomData.name}". Покиньте её сначала.` 
              }, { status: 400 });
            }
          } else {
            // Удаляем из завершенных/отмененных комнат
            await supabase
              .from('_pidr_room_players')
              .delete()
              .eq('id', playerRecord.id);
          }
        }
      }

      // Находим свободную позицию
      const { data: occupiedPositions } = await supabase
        .from('_pidr_room_players')
        .select('position')
        .eq('room_id', room.id);

      const occupied = occupiedPositions?.map((p: any) => p.position) || [];
      let freePosition = 0;
      for (let i = 0; i < room.max_players; i++) {
        if (!occupied.includes(i)) {
          freePosition = i;
          break;
        }
      }

      // Получаем данные пользователя для добавления в комнату
      const { data: userData, error: userError } = await supabase
        .from('_pidr_users')
        .select('username, first_name')
        .eq('id', userId)
        .single();

      const username = userData?.username || userData?.first_name || 'Игрок';

      // Добавляем игрока в комнату
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: username, // ИСПРАВЛЕНО: добавляем username
          position: freePosition,
          is_ready: false
        });

      if (playerError) throw playerError;

      // Обновляем количество игроков в комнате
      const { error: updateError } = await supabase
        .from('_pidr_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', room.id);

      if (updateError) throw updateError;

      // Обновляем статус пользователя
      if (room?.id && userId) {
        await updateUserStatus(userId, 'in_game', room.id.toString());
      }

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

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Rooms POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Internal server error: ${error?.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}

// DELETE /api/rooms - Покинуть комнату или удалить комнату
export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const action = searchParams.get('action') || 'leave'; // leave, delete

    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
    }

    // Получаем информацию о комнате
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('id, host_id, current_players, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, message: 'Room not found' }, { status: 404 });
    }

    if (action === 'delete' && room.host_id === userId) {
      // Удаление комнаты (только хост)
      
      // Получаем список всех игроков в комнате
      const { data: allPlayers } = await supabase
        .from('_pidr_room_players')
        .select('user_id')
        .eq('room_id', roomId);

      // Обновляем статус комнаты на cancelled перед удалением
      await supabase
        .from('_pidr_rooms')
        .update({ 
          status: 'cancelled',
          finished_at: new Date().toISOString()
        })
        .eq('id', roomId);

      // Удаляем всех игроков из комнаты
      await supabase
        .from('_pidr_room_players')
        .delete()
        .eq('room_id', roomId);

      // Затем удаляем комнату
      const { error: deleteError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .eq('id', roomId);

      if (deleteError) throw deleteError;

      // Обновляем статус всех игроков на online
      if (allPlayers && allPlayers.length > 0) {
        const playerIds = allPlayers.map((p: any) => p.user_id);
        for (const playerId of playerIds) {
          await updateUserStatus(playerId, 'online', null);
        }
      }

      return NextResponse.json({ success: true, message: 'Комната удалена' });
    }

    // ИСПРАВЛЕНО: Особая обработка выхода хоста
    if (room.host_id === userId) {
      console.log('👑 Хост покидает свою комнату, НЕ удаляем его из базы - помечаем как absent');
      
      // Для хоста: НЕ удаляем из room_players, а помечаем как "absent" 
      // Это предотвратит дублирование при возвращении
      const { error: hostAbsentError } = await supabase
        .from('_pidr_room_players')
        .update({ 
          is_ready: false,
          // Добавляем поле для отметки отсутствия хоста (если его нет в схеме, можно использовать другие способы)
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (hostAbsentError) {
        console.error('❌ Ошибка обновления статуса хоста:', hostAbsentError);
        // Если обновление не удалось, удаляем как обычного игрока
        await supabase
          .from('_pidr_room_players')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);
      }

      console.log('👑 Хост отмечен как absent, но запись сохранена для возвращения');
      
    } else {
      // Обычный игрок - удаляем как раньше
      const { error: leaveError } = await supabase
        .from('_pidr_room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (leaveError) throw leaveError;
    }

    // Получаем актуальный счет игроков из базы (не полагаемся на old current_players)
    const { data: actualPlayers, error: countError } = await supabase
      .from('_pidr_room_players')
      .select('id')
      .eq('room_id', roomId);

    if (!countError && actualPlayers) {
      const actualPlayerCount = actualPlayers.length;
      console.log(`📊 Обновляем счетчик: было ${room.current_players}, стало ${actualPlayerCount}`);
      
      const { error: updateError } = await supabase
        .from('_pidr_rooms')
        .update({ current_players: actualPlayerCount })
        .eq('id', roomId);

      if (updateError) throw updateError;
    }

    // Обновляем статус пользователя
    await updateUserStatus(userId, 'online', null);

    // Если хост покинул комнату, передаем права другому игроку или удаляем комнату
    if (room.host_id === userId) {
      const { data: remainingPlayers } = await supabase
        .from('_pidr_room_players')
        .select('user_id, joined_at')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (remainingPlayers && remainingPlayers.length > 0) {
        // Передаем права хоста самому старшему игроку
        const newHostId = remainingPlayers[0].user_id;
        await supabase
          .from('_pidr_rooms')
          .update({ host_id: newHostId })
          .eq('id', roomId);
      } else {
        // Если никого не осталось, помечаем комнату как завершенную и удаляем её
        await supabase
          .from('_pidr_rooms')
          .update({ 
            status: 'cancelled',
            finished_at: new Date().toISOString()
          })
          .eq('id', roomId);
          
        // Можем оставить в базе для истории, либо удалить через некоторое время
        // Для демо удалим сразу
        setTimeout(async () => {
          await supabase
            .from('_pidr_rooms')
            .delete()
            .eq('id', roomId);
        }, 5000); // Удаляем через 5 секунд
      }
    }

    return NextResponse.json({ success: true, message: 'Вы покинули комнату' });

  } catch (error) {
    console.error('Rooms DELETE error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// Вспомогательные функции
async function getUserRoomIds(userId: string): Promise<string> {
  const { data } = await supabase
    .from('_pidr_room_players')
    .select('room_id')
    .eq('user_id', userId);
  
  return data?.map((p: any) => p.room_id).join(',') || '';
}

async function updateUserStatus(userId: string, status: string, roomId: string | null) {
  try {
    // ✅ ИСПРАВЛЕНО: Используем существующую таблицу _pidr_users
    await supabase
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        // Если нужно хранить статус, можно добавить поле в _pidr_users
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    console.log('📊 Статус пользователя обновлен в _pidr_users');
  } catch (error) {
    console.error('❌ Ошибка обновления статуса пользователя:', error);
    throw error;
  }
}
