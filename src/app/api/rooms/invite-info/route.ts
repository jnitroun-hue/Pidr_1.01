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

