import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatRoomHostForInvite, resolveRoomHost } from '@/lib/multiplayer/room-host';

export const dynamic = 'force-dynamic';

/** GET /api/rooms/invite-info?roomId=xxx&roomCode=xxx */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const roomCode = searchParams.get('roomCode');

    if (!roomId || !roomCode) {
      return NextResponse.json(
        { success: false, message: 'Room ID и Room Code обязательны' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
    }

    const roomIdNum = parseInt(roomId, 10);
    if (Number.isNaN(roomIdNum)) {
      return NextResponse.json({ success: false, message: 'Некорректный roomId' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, host_id, status, max_players, current_players')
      .eq('id', roomIdNum)
      .eq('room_code', roomCode.toUpperCase())
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json(
        { success: false, message: 'Игра уже началась или комната закрыта' },
        { status: 400 }
      );
    }

    const host = await resolveRoomHost(supabase, room.id, room.host_id);

    if (!host) {
      console.warn(`⚠️ [invite-info] Хост не найден для комнаты ${room.id}, host_id=${room.host_id}`);
      return NextResponse.json({
        success: true,
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          status: room.status,
          maxPlayers: room.max_players,
          currentPlayers: room.current_players,
        },
        host: {
          telegramId: 0,
          username: 'host',
          firstName: 'Хост комнаты',
          avatarUrl: null,
          status: 'online',
          isOnline: true,
        },
        hostFallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.room_code,
        name: room.name,
        status: room.status,
        maxPlayers: room.max_players,
        currentPlayers: room.current_players,
      },
      host: formatRoomHostForInvite(host),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('❌ Ошибка получения информации о приглашении:', error);
    return NextResponse.json({ success: false, message: `Ошибка сервера: ${message}` }, { status: 500 });
  }
}
