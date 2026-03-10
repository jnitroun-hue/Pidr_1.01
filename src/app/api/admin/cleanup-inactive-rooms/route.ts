import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET - показать неактивные комнаты
export async function GET() {
  try {
    console.log('🔍 [GET /api/admin/cleanup-inactive-rooms] Поиск неактивных комнат...');

    // Находим комнаты в статусе 'waiting' старше 10 минут
    const { data: inactiveRooms, error } = await supabase
      .from('_pidr_rooms')
      .select(`
        id, 
        room_code, 
        name, 
        status,
        current_players,
        max_players,
        created_at,
        host_id
      `)
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // 10 минут назад

    if (error) {
      console.error('❌ Ошибка поиска неактивных комнат:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка поиска неактивных комнат: ' + error.message 
      }, { status: 500 });
    }

    console.log(`🔍 Найдено ${inactiveRooms?.length || 0} неактивных комнат`);

    return NextResponse.json({
      success: true,
      inactiveRooms: inactiveRooms || [],
      count: inactiveRooms?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Cleanup inactive rooms GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// POST - удалить неактивные комнаты
export async function POST() {
  try {
    console.log('🗑️ [POST /api/admin/cleanup-inactive-rooms] Удаление неактивных комнат...');

    // Сначала получаем все комнаты в статусе 'waiting'
    const { data: waitingRooms, error: roomsError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, created_at, current_players, host_id')
      .eq('status', 'waiting');

    if (roomsError) {
      console.error('❌ Ошибка получения комнат:', roomsError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения комнат: ' + roomsError.message 
      }, { status: 500 });
    }

    if (!waitingRooms || waitingRooms.length === 0) {
      console.log('✅ Нет комнат в статусе waiting');
      return NextResponse.json({
        success: true,
        message: 'Нет комнат для проверки',
        deletedCount: 0
      });
    }

    // Получаем статус всех хостов
    const hostIds = waitingRooms.map((r: any) => r.host_id);
    const { data: hostStatuses } = await supabase
      .from('_pidr_user_status')
      .select('user_id, status, last_seen')
      .in('user_id', hostIds);

    // Находим комнаты с неактивными хостами
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const inactiveRooms = waitingRooms.filter((room: any) => {
      const hostStatus = hostStatuses?.find((h: any) => h.user_id === room.host_id);
      
      if (!hostStatus) {
        // Если нет статуса хоста - считаем неактивным
        console.log(`🔍 Хост ${room.host_id} комнаты ${room.room_code} не найден в статусах`);
        return true;
      }
      
      const isOffline = hostStatus.status !== 'online';
      const lastSeenTooOld = hostStatus.last_seen && new Date(hostStatus.last_seen) < fifteenMinutesAgo;
      
      if (isOffline || lastSeenTooOld) {
        console.log(`🔍 Хост ${room.host_id} комнаты ${room.room_code} неактивен: status=${hostStatus.status}, last_seen=${hostStatus.last_seen}`);
        return true;
      }
      
      return false;
    });

    console.log(`🔍 Найдено ${inactiveRooms.length} комнат с неактивными хостами из ${waitingRooms.length} общих комнат`);

    if (!inactiveRooms || inactiveRooms.length === 0) {
      console.log('✅ Неактивных комнат не найдено');
      return NextResponse.json({
        success: true,
        message: 'Неактивных комнат не найдено',
        deletedCount: 0
      });
    }

    console.log(`🗑️ Удаляем ${inactiveRooms.length} неактивных комнат:`, 
      inactiveRooms.map((r: any) => `${r.room_code} (${r.name})`));

    const roomIds = inactiveRooms.map((r: any) => r.id);

    // Сначала получаем всех игроков из удаляемых комнат
    const { data: playersToUpdate } = await supabase
      .from('_pidr_room_players')
      .select('user_id')
      .in('room_id', roomIds);

    // ✅ ИСПРАВЛЕНО: Обновляем статус ТОЛЬКО РЕАЛЬНЫХ пользователей (НЕ БОТОВ)
    if (playersToUpdate && playersToUpdate.length > 0) {
      // Фильтруем только реальных игроков (положительные ID)
      const realPlayerIds = playersToUpdate
        .filter((p: any) => parseInt(p.user_id) > 0)
        .map((p: any) => p.user_id);
      
      if (realPlayerIds.length > 0) {
        // Обновляем _pidr_user_status если таблица существует
        await supabase
          .from('_pidr_user_status')
          .update({ 
            current_room_id: null,
            status: 'online'
          })
          .in('user_id', realPlayerIds);
        
        console.log(`✅ Обновлен статус ${realPlayerIds.length} реальных игроков (боты исключены)`);
      }
    }

    // ✅ УДАЛЯЕМ ВСЕХ ИГРОКОВ (включая ботов) из неактивных комнат
    const { error: playersError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .in('room_id', roomIds);

    if (playersError) {
      console.error('❌ Ошибка удаления игроков:', playersError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления игроков: ' + playersError.message 
      }, { status: 500 });
    }

    // Удаляем сами комнаты
    const { error: deleteRoomsError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .in('id', roomIds);

    if (deleteRoomsError) {
      console.error('❌ Ошибка удаления комнат:', deleteRoomsError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления комнат: ' + deleteRoomsError.message 
      }, { status: 500 });
    }

    console.log(`✅ Успешно удалено ${inactiveRooms.length} неактивных комнат`);

    return NextResponse.json({
      success: true,
      message: `Удалено ${inactiveRooms.length} неактивных комнат`,
      deletedRooms: inactiveRooms.map((r: any) => ({
        room_code: r.room_code,
        name: r.name,
        created_at: r.created_at
      })),
      deletedCount: inactiveRooms.length
    });

  } catch (error: any) {
    console.error('❌ Cleanup inactive rooms POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}
