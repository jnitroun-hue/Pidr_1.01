import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ✅ VERCEL CRON JOB - АВТООЧИСТКА КОМНАТ КАЖДЫЕ 5 МИНУТ
// Добавь в vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/cleanup-rooms",
//     "schedule": "*/5 * * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    // Проверяем что это Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 [CRON] Запуск автоочистки комнат...');

    let deletedCount = 0;
    let deletedPlayers = 0;

    // 1️⃣ УДАЛЯЕМ ОФЛАЙН ИГРОКОВ ИЗ КОМНАТ (ОФЛАЙН > 3 МИНУТЫ)
    const { data: offlineUsers } = await supabase
      .from('_pidr_users')
      .select('telegram_id')
      .lt('last_seen', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .neq('status', 'online');

    if (offlineUsers && offlineUsers.length > 0) {
      const { error: deletePlayersError } = await supabase
        .from('_pidr_room_players')
        .delete()
        .in('user_id', offlineUsers.map((u: any) => u.telegram_id));

      if (!deletePlayersError) {
        deletedPlayers = offlineUsers.length;
        console.log(`✅ [CRON] Удалено ${deletedPlayers} офлайн игроков из комнат`);
      }
    }

    // 2️⃣ УДАЛЯЕМ СТАРЫЕ КОМНАТЫ В ОЖИДАНИИ (> 15 МИНУТ)
    const { data: oldRooms } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code')
      .eq('status', 'waiting')
      .lt('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if (oldRooms && oldRooms.length > 0) {
      const { error: deleteOldError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', oldRooms.map((r: any) => r.id));

      if (!deleteOldError) {
        deletedCount += oldRooms.length;
        console.log(`✅ [CRON] Удалено ${oldRooms.length} старых комнат в ожидании (>15 мин)`);
        console.log(`   Коды комнат: ${oldRooms.map((r: any) => r.room_code).join(', ')}`);
      }
    }

    // 2.5️⃣ УДАЛЯЕМ ПУСТЫЕ КОМНАТЫ (БЕЗ ИГРОКОВ)
    const { data: allRooms } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, current_players')
      .eq('status', 'waiting')
      .eq('current_players', 0);

    if (allRooms && allRooms.length > 0) {
      const { error: deleteEmptyError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', allRooms.map((r: any) => r.id));

      if (!deleteEmptyError) {
        deletedCount += allRooms.length;
        console.log(`✅ [CRON] Удалено ${allRooms.length} пустых комнат`);
      }
    }

    // 3️⃣ УДАЛЯЕМ КОМНАТЫ ТОЛЬКО С БОТАМИ
    const { data: rooms } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('status', 'waiting');

    if (rooms) {
      for (const room of rooms) {
        const { data: players } = await supabase
          .from('_pidr_room_players')
          .select('user_id')
          .eq('room_id', room.id);

        if (players && players.length > 0) {
          const hasRealPlayers = players.some((p: any) => {
            const uid = parseInt(String(p.user_id), 10);
            return uid > 0;
          });

          if (!hasRealPlayers) {
            const { error: deleteBotRoomError } = await supabase
              .from('_pidr_rooms')
              .delete()
              .eq('id', room.id);

            if (!deleteBotRoomError) {
              deletedCount++;
              console.log(`✅ [CRON] Удалена комната только с ботами: ${room.id}`);
            }
          }
        }
      }
    }

    // 4️⃣ УДАЛЯЕМ ЗАВЕРШЁННЫЕ КОМНАТЫ (> 10 МИНУТ)
    const { data: finishedRooms } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('status', 'finished')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (finishedRooms && finishedRooms.length > 0) {
      const { error: deleteFinishedError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', finishedRooms.map((r: any) => r.id));

      if (!deleteFinishedError) {
        deletedCount += finishedRooms.length;
        console.log(`✅ [CRON] Удалено ${finishedRooms.length} завершённых комнат`);
      }
    }

    console.log(`✅ [CRON] Очистка завершена! Удалено комнат: ${deletedCount}, офлайн игроков: ${deletedPlayers}`);

    return NextResponse.json({
      success: true,
      deletedRooms: deletedCount,
      deletedPlayers: deletedPlayers,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [CRON] Ошибка очистки:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

