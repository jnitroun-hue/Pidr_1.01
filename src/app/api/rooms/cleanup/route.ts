import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// 🧹 API: Очистка старых и пустых комнат
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 [CLEANUP] Начинаем очистку комнат...');

    let deletedCount = 0;
    let deletedPlayers = 0;

    // 1️⃣ УДАЛЯЕМ ОФЛАЙН ИГРОКОВ ИЗ КОМНАТ (НЕ ОНЛАЙН БОЛЬШЕ 5 МИНУТ)
    const { data: offlineUsers, error: offlineError } = await supabase
      .from('_pidr_users')
      .select('telegram_id')
      .lt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .neq('status', 'online');

    if (offlineUsers && offlineUsers.length > 0) {
      const { error: deletePlayersError } = await supabase
        .from('_pidr_room_players')
        .delete()
        .in('user_id', offlineUsers.map((u: any) => u.telegram_id));

      if (!deletePlayersError) {
        deletedPlayers = offlineUsers.length;
        console.log(`✅ [CLEANUP] Удалено ${deletedPlayers} офлайн игроков из комнат`);
      } else {
        console.error('❌ [CLEANUP] Ошибка удаления офлайн игроков:', deletePlayersError);
      }
    }

    // 2️⃣ УДАЛЯЕМ КОМНАТЫ СТАРШЕ 1 ЧАСА БЕЗ АКТИВНОСТИ
    const { data: oldRooms, error: oldRoomsError } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('status', 'waiting')
      .lt('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (oldRooms && oldRooms.length > 0) {
      const { error: deleteOldError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', oldRooms.map((r: any) => r.id));

      if (!deleteOldError) {
        deletedCount += oldRooms.length;
        console.log(`✅ [CLEANUP] Удалено ${oldRooms.length} старых комнат`);
      } else {
        console.error('❌ [CLEANUP] Ошибка удаления старых комнат:', deleteOldError);
      }
    }

    // 2️⃣ УДАЛЯЕМ КОМНАТЫ С ТОЛЬКО БОТАМИ (БЕЗ РЕАЛЬНЫХ ИГРОКОВ)
    const { data: allRooms, error: allRoomsError } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('status', 'waiting');

    if (allRooms && allRooms.length > 0) {
      for (const room of allRooms) {
        const { data: players, error: playersError } = await supabase
          .from('_pidr_room_players')
          .select('user_id')
          .eq('room_id', room.id);

        if (players && players.length > 0) {
          // Проверяем есть ли хоть один реальный игрок (положительный ID)
          const hasRealPlayers = players.some((p: any) => {
            const uid = parseInt(String(p.user_id), 10);
            return uid > 0;
          });

          // Если только боты - удаляем комнату
          if (!hasRealPlayers) {
            const { error: deleteBotRoomError } = await supabase
              .from('_pidr_rooms')
              .delete()
              .eq('id', room.id);

            if (!deleteBotRoomError) {
              deletedCount++;
              console.log(`✅ [CLEANUP] Удалена комната ${room.id} (только боты)`);
            } else {
              console.error(`❌ [CLEANUP] Ошибка удаления комнаты ${room.id}:`, deleteBotRoomError);
            }
          }
        }
      }
    }

    // 3️⃣ УДАЛЯЕМ ПУСТЫЕ КОМНАТЫ (БЕЗ ИГРОКОВ)
    const { data: emptyRooms, error: emptyRoomsError } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('status', 'waiting');

    if (emptyRooms && emptyRooms.length > 0) {
      for (const room of emptyRooms) {
        const { data: players, error: playersError } = await supabase
          .from('_pidr_room_players')
          .select('user_id')
          .eq('room_id', room.id);

        // Если нет игроков - удаляем
        if (!players || players.length === 0) {
          const { error: deleteEmptyError } = await supabase
            .from('_pidr_rooms')
            .delete()
            .eq('id', room.id);

          if (!deleteEmptyError) {
            deletedCount++;
            console.log(`✅ [CLEANUP] Удалена пустая комната ${room.id}`);
          } else {
            console.error(`❌ [CLEANUP] Ошибка удаления пустой комнаты ${room.id}:`, deleteEmptyError);
          }
        }
      }
    }

    // 4️⃣ УДАЛЯЕМ ЗАВЕРШЁННЫЕ КОМНАТЫ СТАРШЕ 10 МИНУТ
    const { data: finishedRooms, error: finishedRoomsError } = await supabase
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
        console.log(`✅ [CLEANUP] Удалено ${finishedRooms.length} завершённых комнат`);
      } else {
        console.error('❌ [CLEANUP] Ошибка удаления завершённых комнат:', deleteFinishedError);
      }
    }

    console.log(`✅ [CLEANUP] Очистка завершена! Удалено комнат: ${deletedCount}, офлайн игроков: ${deletedPlayers}`);

    return NextResponse.json({
      success: true,
      message: 'Очистка завершена',
      deleted_rooms: deletedCount,
      deleted_players: deletedPlayers
    });

  } catch (error: any) {
    console.error('❌ [CLEANUP] Ошибка очистки:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка очистки комнат'
    }, { status: 500 });
  }
}

// GET для ручного вызова
export async function GET(request: NextRequest) {
  return POST(request);
}
