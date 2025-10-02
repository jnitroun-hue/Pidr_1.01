import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/rooms/[roomId]/players - получить всех игроков в комнате
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const { roomId } = params;
    
    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
    }

    console.log(`🔍 [GET /api/rooms/${roomId}/players] Загружаем игроков комнаты`);

    // УПРОЩЕННЫЙ ЗАПРОС: Получаем игроков без JOIN
    const { data: players, error } = await supabase
      .from('_pidr_room_players')
      .select('user_id, username, position, is_ready, joined_at')
      .eq('room_id', roomId)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ Ошибка загрузки игроков:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка загрузки игроков: ' + error.message 
      }, { status: 500 });
    }

    // Форматируем данные игроков (упрощенно)
    const formattedPlayers = players.map(player => ({
      user_id: player.user_id,
      username: player.username || 'Игрок',
      position: player.position,
      is_ready: player.is_ready,
      joined_at: player.joined_at,
      avatar_url: null // Пока без аватаров
    }));

    console.log(`✅ [GET /api/rooms/${roomId}/players] Найдено ${formattedPlayers.length} игроков`);

    return NextResponse.json({
      success: true,
      players: formattedPlayers
    });

  } catch (error: any) {
    console.error('❌ Room players GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}
