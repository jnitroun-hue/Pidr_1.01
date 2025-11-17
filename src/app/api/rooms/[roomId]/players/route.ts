import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 📋 API ДЛЯ ПОЛУЧЕНИЯ СПИСКА ИГРОКОВ В КОМНАТЕ
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    console.log(`📋 [GET /api/rooms/${roomId}/players] Получение списка игроков`);

    // ✅ СНАЧАЛА ПОЛУЧАЕМ ИНФОРМАЦИЮ О КОМНАТЕ (max_players!)
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('max_players, current_players, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('❌ [GET /api/rooms/players] Комната не найдена:', roomError);
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена: ' + (roomError?.message || 'Unknown error')
      }, { status: 404 });
    }

    // ✅ ПОЛУЧАЕМ ИНФОРМАЦИЮ О КОМНАТЕ (host_id!)
    const { data: roomFull, error: roomFullError } = await supabase
      .from('_pidr_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();

    // Получаем список игроков из БД
    const { data: players, error } = await supabase
      .from('_pidr_room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('position', { ascending: true });

    // ✅ ДОБАВЛЯЕМ is_host К КАЖДОМУ ИГРОКУ
    const playersWithHost = (players || []).map((player: any) => ({
      ...player,
      is_host: roomFull?.host_id === player.user_id // ✅ Сравниваем host_id с user_id
    }));

    if (error) {
      console.error('❌ [GET /api/rooms/players] Ошибка получения игроков:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения игроков: ' + error.message 
      }, { status: 500 });
    }

    console.log(`✅ [GET /api/rooms/players] Найдено игроков: ${players?.length || 0}, max: ${room.max_players}`);

    return NextResponse.json({ 
      success: true, 
      players: playersWithHost || [], // ✅ ИСПОЛЬЗУЕМ playersWithHost
      maxPlayers: room.max_players, // ✅ ДОБАВЛЕНО!
      currentPlayers: players?.length || 0,
      roomStatus: room.status
    });

  } catch (error) {
    console.error('❌ [GET /api/rooms/players] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
