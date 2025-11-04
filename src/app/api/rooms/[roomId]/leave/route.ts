import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// 🚪 API ДЛЯ ПОКИДАНИЯ КОМНАТЫ
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    // ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const telegramId = auth.userId as string;

    console.log(`🚪 [POST /api/rooms/${roomId}/leave] Игрок ${telegramId} покидает комнату`);

    // Удаляем игрока из комнаты
    const { error: deleteError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', telegramId);

    if (deleteError) {
      console.error('❌ [leave] Ошибка удаления игрока:', deleteError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка покидания комнаты: ' + deleteError.message 
      }, { status: 500 });
    }

    // Обновляем счетчик игроков в комнате
    const { data: room } = await supabase
      .from('_pidr_rooms')
      .select('current_players')
      .eq('id', roomId)
      .single();

    if (room) {
      await supabase
        .from('_pidr_rooms')
        .update({ 
          current_players: Math.max(0, (room.current_players || 1) - 1),
          last_activity: new Date().toISOString()
        })
        .eq('id', roomId);
    }

    console.log(`✅ [leave] Игрок ${telegramId} покинул комнату ${roomId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Вы покинули комнату' 
    });

  } catch (error) {
    console.error('❌ [leave] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

