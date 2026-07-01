import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { canStartRoom } from '@/lib/multiplayer/room-rules';
import { isRoomHostUser } from '@/lib/multiplayer/room-host';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🎮 API: Старт игры в комнате
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId: roomIdStr } = await params;
  try {
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { userId, environment } = auth;
    const roomId = parseInt(roomIdStr, 10);

    console.log(`🎮 [START GAME] Комната ${roomId}, хост: ${userId} (${environment})`);

    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      console.error(`❌ [START GAME] Пользователь не найден (${environment}):`, userId);
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }
    
    const userUUID = dbUserId;
    console.log(`👤 [START GAME] Пользователь найден: UUID=${userUUID}, telegram_id=${userId}`);

    // 1️⃣ ПРОВЕРЯЕМ ЧТО ПОЛЬЗОВАТЕЛЬ - ХОСТ
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('❌ [START GAME] Комната не найдена:', roomError);
      return NextResponse.json({ success: false, error: 'Комната не найдена' }, { status: 404 });
    }

    const userIsHost = await isRoomHostUser(supabase, roomId, {
      dbUserId: userUUID,
      telegramId: dbUser.telegram_id ?? userId,
      vkId: dbUser.vk_id,
    });

    if (!userIsHost) {
      console.error('❌ [START GAME] Не хост:', { userUUID, hostId: room.host_id, telegramId: userId });
      return NextResponse.json({ success: false, error: 'Только хост может начать игру' }, { status: 403 });
    }

    // 2️⃣ ПРОВЕРЯЕМ КОЛИЧЕСТВО РЕАЛЬНЫХ ИГРОКОВ
    const { data: players, error: playersError } = await supabase
      .from('_pidr_room_players')
      .select('user_id')
      .eq('room_id', roomId);

    if (playersError || !players) {
      console.error('❌ [START GAME] Ошибка получения игроков:', playersError);
      return NextResponse.json({ success: false, error: 'Ошибка получения игроков' }, { status: 500 });
    }

    console.log(`👥 [START GAME] Игроков: ${players.length}/${room.max_players}`);

    if (!canStartRoom(players.length, room.max_players)) {
      return NextResponse.json({
        success: false,
        error: `Нужно ${room.max_players} игроков за столом (сейчас ${players.length})`,
      }, { status: 400 });
    }

    const realPlayers = players.filter((p: { user_id: unknown }) => parseInt(String(p.user_id), 10) > 0);
    if (realPlayers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нельзя начать игру без реальных игроков',
      }, { status: 400 });
    }
    const botPlayers = players.filter((p: { user_id: unknown }) => parseInt(String(p.user_id), 10) < 0);

    const gameLaunchAt = Date.now() + 3200;
    const existingSettings =
      room.game_settings && typeof room.game_settings === 'object' && !Array.isArray(room.game_settings)
        ? room.game_settings
        : {};

    // МЕНЯЕМ СТАТУС КОМНАТЫ НА "PLAYING" + фиксируем единый момент старта для всех клиентов
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('_pidr_rooms')
      .update({
        status: 'playing',
        started_at: now,
        last_activity: now,
        updated_at: now,
        game_settings: {
          ...existingSettings,
          gameLaunchAt,
        },
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('❌ [START GAME] Ошибка обновления комнаты:', updateError);
      return NextResponse.json({ success: false, error: 'Ошибка старта игры' }, { status: 500 });
    }

    console.log(`✅ [START GAME] Игра началась! Комната ${roomId}, игроков: ${players.length}`);

    return NextResponse.json({
      success: true,
      message: 'Игра началась!',
      gameLaunchAt,
      room: {
        id: roomId,
        status: 'playing',
        player_count: players.length,
        real_players: realPlayers.length,
        bots: botPlayers.length,
        gameLaunchAt,
      }
    });

  } catch (error: any) {
    console.error('❌ [START GAME] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error instanceof Error ? error.message : String(error)) || 'Ошибка старта игры' 
    }, { status: 500 });
  }
}

