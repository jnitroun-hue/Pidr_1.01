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
        message: 'Ошибка получения игроков: ' + error.message 
      }, { status: 500 });
    }

    console.log(`✅ [GET /api/rooms/players] Найдено игроков: ${players?.length || 0}`);

    return NextResponse.json({ 
      success: true, 
      players: players || []
    });

  } catch (error) {
    console.error('❌ [GET /api/rooms/players] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
