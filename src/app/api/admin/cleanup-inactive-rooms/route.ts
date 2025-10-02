import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Находим комнаты в статусе 'waiting' старше 10 минут
    const { data: inactiveRooms, error: findError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, created_at')
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (findError) {
      console.error('❌ Ошибка поиска неактивных комнат:', findError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка поиска: ' + findError.message 
      }, { status: 500 });
    }

    if (!inactiveRooms || inactiveRooms.length === 0) {
      console.log('✅ Неактивных комнат не найдено');
      return NextResponse.json({
        success: true,
        message: 'Неактивных комнат не найдено',
        deletedCount: 0
      });
    }

    console.log(`🗑️ Удаляем ${inactiveRooms.length} неактивных комнат:`, 
      inactiveRooms.map(r => `${r.room_code} (${r.name})`));

    const roomIds = inactiveRooms.map(r => r.id);

    // Удаляем игроков из неактивных комнат
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
    const { error: roomsError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .in('id', roomIds);

    if (roomsError) {
      console.error('❌ Ошибка удаления комнат:', roomsError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления комнат: ' + roomsError.message 
      }, { status: 500 });
    }

    console.log(`✅ Успешно удалено ${inactiveRooms.length} неактивных комнат`);

    return NextResponse.json({
      success: true,
      message: `Удалено ${inactiveRooms.length} неактивных комнат`,
      deletedRooms: inactiveRooms.map(r => ({
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
