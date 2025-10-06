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

    // ПОЛУЧАЕМ РЕАЛЬНЫЕ ИМЕНА ХОСТОВ
    const roomsWithHosts = await Promise.all((rooms || []).map(async (room: any) => {
      // Получаем имя хоста
      const { data: hostUser } = await supabase
        .from('_pidr_users')
        .select('username, avatar_url')
        .eq('id', room.host_id)
        .single();

      console.log(`🔍 [GET] Комната ${room.id}: max_players=${room.max_players}, current_players=${room.current_players}`);
      
      return {
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        max_players: room.max_players,
        current_players: room.current_players,
        status: room.status,
        is_private: room.is_private,
        created_at: room.created_at,
        users: { 
          username: hostUser?.username || 'Хост', 
          avatar: hostUser?.avatar_url || null 
        },
        players: []
      };
    }));

    return NextResponse.json({ 
      success: true, 
      rooms: roomsWithHosts
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
    console.log('🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА maxPlayers:', {
      maxPlayers,
      type: typeof maxPlayers,
      isUndefined: maxPlayers === undefined,
      isNull: maxPlayers === null,
      finalValue: maxPlayers || 6
    });

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

      // СОЗДАЕМ КОМНАТУ С ПОЛНЫМИ НАСТРОЙКАМИ
      const roomCode = generateRoomCode();
      const roomSettings = {
        gameMode: gameMode || 'casual',
        isRanked: gameMode === 'ranked',
        allowBots: true,
        maxPlayers: maxPlayers || 6,
        hasPassword: hasPassword || false
      };

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
          settings: roomSettings, // СОХРАНЯЕМ НАСТРОЙКИ
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

      // ПОЛУЧАЕМ РЕАЛЬНОЕ ИМЯ ХОСТА
      const { data: hostData } = await supabase
        .from('_pidr_users')
        .select('username')
        .eq('id', userId)
        .single();

      if (!hostData?.username) {
        console.error('❌ Не удалось получить имя пользователя');
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }

      // ДОБАВЛЯЕМ ХОСТА И ОБНОВЛЯЕМ СЧЕТЧИК
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: hostData.username, // ТОЛЬКО РЕАЛЬНОЕ ИМЯ!
          position: 1, // ХОСТ ВСЕГДА ПОЗИЦИЯ 1
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

      // УДАЛЯЕМ ИГРОКА ИЗ ВСЕХ ДРУГИХ КОМНАТ (предотвращаем дублирование)
      const { error: cleanupError } = await supabase
        .from('_pidr_room_players')
        .delete()
        .eq('user_id', userId)
        .neq('room_id', room.id);

      if (cleanupError) {
        console.error('⚠️ Предупреждение: не удалось очистить старые комнаты:', cleanupError);
      } else {
        console.log('🧹 Игрок удален из других комнат');
      }

      // ПРОВЕРЯЕМ СУЩЕСТВУЕТ ЛИ УЖЕ ИГРОК В КОМНАТЕ
      const { data: existingPlayer } = await supabase
        .from('_pidr_room_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single();

      // ПОЛУЧАЕМ РЕАЛЬНОЕ ИМЯ ИГРОКА
      const { data: userData } = await supabase
        .from('_pidr_users')
        .select('username')
        .eq('id', userId)
        .single();

      // ПРОВЕРЯЕМ ЯВЛЯЕТСЯ ЛИ ИГРОК ХОСТОМ
      const isHost = room.host_id === userId;
      
      let finalPosition;
      
      if (existingPlayer) {
        // ИГРОК УЖЕ В КОМНАТЕ - ОБНОВЛЯЕМ ТОЛЬКО is_ready
        console.log(`🔄 Игрок уже в комнате: position=${existingPlayer.position}, isHost=${isHost}`);
        
        if (isHost && existingPlayer.position !== 1) {
          // ХОСТ ДОЛЖЕН БЫТЬ НА ПОЗИЦИИ 1 - ИСПРАВЛЯЕМ
          finalPosition = 1;
          console.log(`👑 ИСПРАВЛЯЕМ позицию хоста: ${existingPlayer.position} → 1`);
        } else {
          // СОХРАНЯЕМ СУЩЕСТВУЮЩУЮ ПОЗИЦИЮ
          finalPosition = existingPlayer.position;
        }
      } else {
        // НОВЫЙ ИГРОК
        if (isHost) {
          // ХОСТ ВСЕГДА ПОЛУЧАЕТ ПОЗИЦИЮ 1
          finalPosition = 1;
          console.log(`👑 Новый ХОСТ: position=${finalPosition}`);
        } else {
          // ПОЛУЧАЕМ МАКСИМАЛЬНУЮ ПОЗИЦИЮ В КОМНАТЕ
          const { data: maxPositionData } = await supabase
            .from('_pidr_room_players')
            .select('position')
            .eq('room_id', room.id)
            .order('position', { ascending: false })
            .limit(1);

          const maxPosition = maxPositionData?.[0]?.position || 0;
          finalPosition = maxPosition + 1;
          console.log(`🎯 Новый игрок: maxPosition=${maxPosition}, finalPosition=${finalPosition}`);
        }
      }

      // ВЫПОЛНЯЕМ UPSERT ОПЕРАЦИЮ
      let playerError;
      
      if (existingPlayer) {
        // ОБНОВЛЯЕМ СУЩЕСТВУЮЩЕГО ИГРОКА
        console.log(`🔄 Обновляем игрока: позиция=${finalPosition}, isHost=${isHost}`);
        
        const { error } = await supabase
          .from('_pidr_room_players')
          .update({
            username: userData?.username || 'Игрок',
            position: finalPosition,
            is_ready: isHost // ХОСТ СРАЗУ ГОТОВ
          })
          .eq('room_id', room.id)
          .eq('user_id', userId);
        playerError = error;
      } else {
        // ДОБАВЛЯЕМ НОВОГО ИГРОКА
        console.log(`➕ Добавляем нового игрока с позицией ${finalPosition}`);
        const { error } = await supabase
          .from('_pidr_room_players')
          .insert({
            room_id: room.id,
            user_id: userId,
            username: userData?.username || 'Игрок',
            position: finalPosition,
            is_ready: isHost // ХОСТ СРАЗУ ГОТОВ
          });
        playerError = error;
      }

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
            roomCode: room.room_code,
            name: room.name,
            position: finalPosition, // ФИНАЛЬНАЯ ПОЗИЦИЯ
            isHost: isHost
          }
        });
    }

    if (action === 'leave') {
      // ВЫХОД ИЗ КОМНАТЫ
      const { roomId } = body;
      
      if (!roomId) {
        return NextResponse.json({ success: false, message: 'ID комнаты обязателен' }, { status: 400 });
      }

      // ПРОВЕРЯЕМ ЯВЛЯЕТСЯ ЛИ ИГРОК ХОСТОМ
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();

      const isHost = room?.host_id === userId;

      if (isHost) {
        // ХОСТ НЕ УДАЛЯЕТСЯ, ТОЛЬКО ПОМЕЧАЕТСЯ КАК НЕАКТИВНЫЙ
        console.log('🏠 Хост выходит, но остается в комнате');
        const { error: updateError } = await supabase
          .from('_pidr_room_players')
          .update({ is_ready: false })
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (updateError) {
          console.error('❌ Ошибка обновления хоста:', updateError);
        }
      } else {
        // ОБЫЧНЫЙ ИГРОК УДАЛЯЕТСЯ
        const { error: leaveError } = await supabase
          .from('_pidr_room_players')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (leaveError) {
          console.error('❌ Ошибка выхода из комнаты:', leaveError);
          return NextResponse.json({ 
            success: false, 
            message: 'Ошибка выхода из комнаты: ' + leaveError.message 
          }, { status: 500 });
        }
      }

      // ОБНОВЛЯЕМ СЧЕТЧИК ИГРОКОВ (только для обычных игроков)
      if (!isHost) {
        const { data: roomData } = await supabase
          .from('_pidr_rooms')
          .select('current_players')
          .eq('id', roomId)
          .single();

        if (roomData && roomData.current_players > 0) {
          await supabase
            .from('_pidr_rooms')
            .update({ current_players: roomData.current_players - 1 })
            .eq('id', roomId);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Вышли из комнаты' 
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
