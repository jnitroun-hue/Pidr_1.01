import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

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

    // ✅ ИСПРАВЛЕНО: Сравниваем UUID с UUID
    if (room.host_id !== userUUID) {
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

    const realPlayers = players.filter((p: any) => parseInt(String(p.user_id), 10) > 0);
    const botPlayers = players.filter((p: any) => parseInt(String(p.user_id), 10) < 0);

    console.log(`👥 [START GAME] Реальных игроков: ${realPlayers.length}, ботов: ${botPlayers.length}`);

    // ❌ НЕ РАЗРЕШАЕМ СТАРТ ЕСЛИ ТОЛЬКО БОТЫ!
    if (realPlayers.length === 0) {
      console.error('❌ [START GAME] Нет реальных игроков!');
      return NextResponse.json({ 
        success: false, 
        error: 'Нельзя начать игру без реальных игроков!' 
      }, { status: 400 });
    }

    // ✅ МИНИМУМ 2 ИГРОКА (РЕАЛЬНЫХ + БОТОВ)
    if (players.length < 2) {
      console.error('❌ [START GAME] Недостаточно игроков:', players.length);
      return NextResponse.json({ 
        success: false, 
        error: 'Минимум 2 игрока для начала игры' 
      }, { status: 400 });
    }

    // 3️⃣ ПРОВЕРЯЕМ ЧТО ВСЕ РЕАЛЬНЫЕ ИГРОКИ ГОТОВЫ
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('_pidr_room_players')
      .select('user_id, is_ready')
      .eq('room_id', roomId);

    if (allPlayersError) {
      console.error('❌ [START GAME] Ошибка проверки готовности:', allPlayersError);
      return NextResponse.json({ success: false, error: 'Ошибка проверки готовности' }, { status: 500 });
    }

    const notReadyRealPlayers = allPlayers.filter((p: any) => {
      const uid = parseInt(String(p.user_id), 10);
      return uid > 0 && !p.is_ready; // Только реальные игроки
    });

    if (notReadyRealPlayers.length > 0) {
      console.error('❌ [START GAME] Не все игроки готовы:', notReadyRealPlayers.length);
      return NextResponse.json({ 
        success: false, 
        error: 'Не все игроки готовы' 
      }, { status: 400 });
    }

    // 4️⃣ МЕНЯЕМ СТАТУС КОМНАТЫ НА "PLAYING"
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('_pidr_rooms')
      .update({
        status: 'playing',
        last_activity: now, // ✅ ОБНОВЛЯЕМ АКТИВНОСТЬ
        updated_at: now
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
      room: {
        id: roomId,
        status: 'playing',
        player_count: players.length,
        real_players: realPlayers.length,
        bots: botPlayers.length
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

