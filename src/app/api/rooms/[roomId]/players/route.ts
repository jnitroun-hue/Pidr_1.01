import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 📋 API ДЛЯ ПОЛУЧЕНИЯ СПИСКА ИГРОКОВ В КОМНАТЕ
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = parseInt(params.roomId, 10);

    if (Number.isNaN(roomId)) {
      return NextResponse.json(
        { success: false, message: 'Некорректный roomId' },
        { status: 400 }
      );
    }

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
      .map((player: any) => {
        const raw = player.user_id;
        const numeric = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        return Number.isFinite(numeric) ? numeric : null;
      })
      .filter((id: number | null): id is number => id != null && id > 0);

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
      const rawUserId = player.user_id;
      const numericUserId =
        typeof rawUserId === 'number' ? rawUserId : parseInt(String(rawUserId), 10);
      const isBot = Number.isFinite(numericUserId) && numericUserId < 0;
      const userData = isBot ? null : usersMap.get(numericUserId);
      const isHost =
        !isBot &&
        room?.host_id &&
        (String(room.host_id) === String(rawUserId) ||
          (userData?.id != null && String(room.host_id) === String(userData.id)));
      const publicUserId = isBot
        ? String(player.user_id)
        : String(userData?.telegram_id ?? player.user_id);

      return {
        ...player,
        user_id: publicUserId,
        db_user_id: isBot ? null : (userData?.id ?? (Number.isFinite(numericUserId) ? numericUserId : null)),
        username: player.username || userData?.username || 'Игрок',
        avatar_url: player.avatar_url || userData?.avatar_url || null,
        is_host: isHost || player.is_host === true,
        is_bot: isBot
      };
    });

    const missingHostFlag = playersWithHost.find((player: any) => player.is_host && !player.is_bot);
    if (missingHostFlag?.db_user_id != null) {
      const hostRow = (players || []).find((player: any) => {
        const rawId = player.user_id;
        const numericId =
          typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
        return (
          String(rawId) === String(missingHostFlag.db_user_id) ||
          (Number.isFinite(numericId) && numericId === missingHostFlag.db_user_id)
        );
      });

      if (hostRow && hostRow.is_host !== true) {
        const updateKey = hostRow.user_id;
        void supabase
          .from('_pidr_room_players')
          .update({ is_host: true })
          .eq('room_id', roomId)
          .eq('user_id', updateKey)
          .select('id')
          .then((result: { data: { id: number }[] | null; error: unknown }) => {
            if (result.error) {
              console.error(`❌ [GET /api/rooms/players] Ошибка исправления is_host:`, result.error);
              return;
            }
            if (result.data?.length) {
              console.log(`✅ [GET /api/rooms/players] is_host исправлен для ${missingHostFlag.db_user_id}`);
            }
          });
      }
    }

    console.log(`✅ [GET /api/rooms/players] Найдено игроков: ${players?.length || 0}, max: ${room.max_players}`);

    const response = NextResponse.json({ 
      success: true, 
      players: playersWithHost || [], // ✅ ИСПОЛЬЗУЕМ playersWithHost
      maxPlayers: room.max_players, // ✅ ДОБАВЛЕНО!
      currentPlayers: players?.length || 0,
      roomStatus: room.status
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;

  } catch (error: unknown) {
    console.error('❌ [GET /api/rooms/players] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
