import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// 📋 API ДЛЯ ПОЛУЧЕНИЯ СПИСКА ИГРОКОВ В КОМНАТЕ
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    console.log(`📋 [GET /api/rooms/${roomId}/players] Получение списка игроков`);

    // ✅ ИСПРАВЛЕНО: Один запрос для получения всей информации о комнате
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('max_players, current_players, status, host_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('❌ [GET /api/rooms/players] Комната не найдена:', roomError);
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена: ' + (roomError?.message || 'Unknown error')
      }, { status: 404 });
    }

    // Получаем список игроков из БД
    const { data: players, error } = await supabase
      .from('_pidr_room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ [GET /api/rooms/players] Ошибка получения игроков:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения игроков: ' + (error instanceof Error ? error.message : String(error)) 
      }, { status: 500 });
    }

    const dbUserIds = (players || [])
      .map((player: any) => player.user_id)
      .filter((id: any) => typeof id === 'number' && id > 0);

    const { data: users } = dbUserIds.length > 0
      ? await supabase
          .from('_pidr_users')
          .select('id, telegram_id, username, avatar_url')
          .in('id', dbUserIds)
      : { data: [] as any[] };

    const usersMap = new Map<number, any>();
    (users || []).forEach((user: any) => {
      usersMap.set(user.id, user);
    });

    const playersWithHost = (players || []).map((player: any) => {
      const isBot = typeof player.user_id === 'number' && player.user_id < 0;
      const userData = isBot ? null : usersMap.get(player.user_id);
      const isHost = !isBot && room?.host_id && String(room.host_id) === String(player.user_id);
      const publicUserId = isBot
        ? player.user_id
        : (userData?.telegram_id ?? player.user_id);

      return {
        ...player,
        user_id: publicUserId,
        db_user_id: isBot ? null : player.user_id,
        username: player.username || userData?.username || 'Игрок',
        avatar_url: player.avatar_url || userData?.avatar_url || null,
        is_host: isHost || player.is_host === true,
        is_bot: isBot
      };
    });

    const missingHostFlag = playersWithHost.find((player: any) => player.is_host && !player.is_bot);
    if (missingHostFlag && !players?.find((player: any) => player.user_id === missingHostFlag.db_user_id && player.is_host)) {
      supabase
        .from('_pidr_room_players')
        .update({ is_host: true })
        .eq('room_id', roomId)
        .eq('user_id', missingHostFlag.db_user_id)
        .then(() => console.log(`✅ [GET /api/rooms/players] is_host исправлен для ${missingHostFlag.db_user_id}`))
        .catch((err: unknown) => console.error(`❌ [GET /api/rooms/players] Ошибка исправления is_host:`, err));
    }

    console.log(`✅ [GET /api/rooms/players] Найдено игроков: ${players?.length || 0}, max: ${room.max_players}`);

    return NextResponse.json({ 
      success: true, 
      players: playersWithHost || [], // ✅ ИСПОЛЬЗУЕМ playersWithHost
      maxPlayers: room.max_players, // ✅ ДОБАВЛЕНО!
      currentPlayers: players?.length || 0,
      roomStatus: room.status
    });

  } catch (error: unknown) {
    console.error('❌ [GET /api/rooms/players] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
