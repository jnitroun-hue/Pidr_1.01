import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - удалить ВСЕ комнаты (ОПАСНО!)
export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ [POST /api/admin/delete-all-rooms] УДАЛЕНИЕ ВСЕХ КОМНАТ...');

    // Проверяем подтверждение
    const body = await request.json();
    if (body.confirm !== 'DELETE_ALL_ROOMS') {
      return NextResponse.json({ 
        success: false, 
        message: 'Требуется подтверждение: { "confirm": "DELETE_ALL_ROOMS" }' 
      }, { status: 400 });
    }

    // Получаем статистику перед удалением
    const { data: roomsBefore, error: statsError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, status, current_players');

    if (statsError) {
      console.error('❌ Ошибка получения статистики:', statsError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения статистики: ' + statsError.message 
      }, { status: 500 });
    }

    const totalRooms = roomsBefore?.length || 0;
    console.log(`📊 Найдено ${totalRooms} комнат для удаления`);

    if (totalRooms === 0) {
      return NextResponse.json({
        success: true,
        message: 'Комнаты уже отсутствуют',
        deletedRooms: 0,
        deletedPlayers: 0
      });
    }

    // Получаем всех игроков для обновления статуса
    const { data: allPlayers } = await supabase
      .from('_pidr_room_players')
      .select('user_id');

    const playerCount = allPlayers?.length || 0;
    console.log(`👥 Найдено ${playerCount} игроков в комнатах`);

    // Обновляем статус всех пользователей
    if (allPlayers && allPlayers.length > 0) {
      const userIds = allPlayers.map(p => p.user_id);
      
      await supabase
        .from('_pidr_user_status')
        .update({ 
          current_room_id: null,
          status: 'online'
        })
        .in('user_id', userIds);
      
      console.log(`✅ Обновлен статус ${userIds.length} пользователей`);
    }

    // Удаляем всех игроков из комнат
    const { error: playersError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .neq('id', 0); // Удаляем все записи

    if (playersError) {
      console.error('❌ Ошибка удаления игроков:', playersError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления игроков: ' + playersError.message 
      }, { status: 500 });
    }

    // Удаляем все комнаты
    const { error: roomsError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .neq('id', 0); // Удаляем все записи

    if (roomsError) {
      console.error('❌ Ошибка удаления комнат:', roomsError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления комнат: ' + roomsError.message 
      }, { status: 500 });
    }

    console.log(`✅ УСПЕШНО УДАЛЕНО: ${totalRooms} комнат, ${playerCount} игроков`);

    return NextResponse.json({
      success: true,
      message: `🗑️ Успешно удалено ВСЕ комнаты и игроков`,
      deletedRooms: totalRooms,
      deletedPlayers: playerCount,
      roomsDeleted: roomsBefore?.map(r => ({
        room_code: r.room_code,
        name: r.name,
        status: r.status,
        players: r.current_players
      })) || []
    });

  } catch (error: any) {
    console.error('❌ Delete all rooms error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// GET - показать статистику комнат
export async function GET() {
  try {
    console.log('📊 [GET /api/admin/delete-all-rooms] Статистика комнат...');

    const { data: rooms, error } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, status, current_players, max_players, created_at');

    if (error) {
      console.error('❌ Ошибка получения комнат:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения комнат: ' + error.message 
      }, { status: 500 });
    }

    const { data: players } = await supabase
      .from('_pidr_room_players')
      .select('id, user_id, room_id');

    const stats = {
      totalRooms: rooms?.length || 0,
      waitingRooms: rooms?.filter(r => r.status === 'waiting').length || 0,
      playingRooms: rooms?.filter(r => r.status === 'playing').length || 0,
      finishedRooms: rooms?.filter(r => r.status === 'finished').length || 0,
      totalPlayers: players?.length || 0
    };

    return NextResponse.json({
      success: true,
      stats,
      rooms: rooms || [],
      players: players || []
    });

  } catch (error: any) {
    console.error('❌ Get rooms stats error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}
