import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/rooms/invite-info?roomId=..&roomCode=..
// Возвращает краткую информацию о комнате и хосте для модального окна приглашения
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const roomCode = searchParams.get('roomCode');

    if (!roomId || !roomCode) {
      return NextResponse.json(
        { success: false, message: 'roomId и roomCode обязательны' },
        { status: 400 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('room_code', roomCode)
      .in('status', ['waiting', 'playing'])
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { success: false, message: 'Комната не найдена или уже закрыта' },
        { status: 404 }
      );
    }

    // Получаем информацию о хосте
    let host = null;
    if (room.host_id) {
      const { data: hostUser } = await supabase
        .from('_pidr_users')
        .select('telegram_id, username, first_name, avatar_url, status')
        .eq('id', room.host_id)
        .single();
      if (hostUser) {
        host = {
          telegramId: hostUser.telegram_id,
          username: hostUser.username,
          firstName: hostUser.first_name,
          avatarUrl: hostUser.avatar_url,
          status: hostUser.status
        };
      }
    }

    const roomInfo = {
      id: String(room.id),
      roomCode: room.room_code,
      name: room.name,
      status: room.status,
      maxPlayers: room.max_players,
      currentPlayers: room.current_players
    };

    return NextResponse.json({
      success: true,
      room: roomInfo,
      host
    });
  } catch (error: any) {
    console.error('❌ [ROOM INVITE INFO] Ошибка API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/rooms/invite-info?roomId=xxx&roomCode=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const roomCode = searchParams.get('roomCode');

    if (!roomId || !roomCode) {
      return NextResponse.json({
        success: false,
        message: 'Room ID и Room Code обязательны'
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем информацию о комнате
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, host_id, status, max_players, current_players')
      .eq('id', roomId)
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      console.error('❌ Комната не найдена:', roomError);
      return NextResponse.json({
        success: false,
        message: 'Комната не найдена'
      }, { status: 404 });
    }

    // Проверяем статус комнаты
    if (room.status !== 'waiting') {
      return NextResponse.json({
        success: false,
        message: 'Игра уже началась или комната закрыта'
      }, { status: 400 });
    }

    // Получаем информацию о хосте
    const { data: host, error: hostError } = await supabase
      .from('_pidr_users')
      .select('telegram_id, username, first_name, avatar_url, status')
      .eq('telegram_id', room.host_id)
      .single();

    if (hostError || !host) {
      console.error('❌ Хост не найден:', hostError);
      return NextResponse.json({
        success: false,
        message: 'Хост не найден'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        name: room.name,
        status: room.status,
        maxPlayers: room.max_players,
        currentPlayers: room.current_players
      },
      host: {
        telegramId: host.telegram_id,
        username: host.username,
        firstName: host.first_name,
        avatarUrl: host.avatar_url,
        status: host.status
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения информации о приглашении:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

