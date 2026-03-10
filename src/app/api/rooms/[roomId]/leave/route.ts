import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🚪 API ДЛЯ ПОКИДАНИЯ КОМНАТЫ
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { userId, environment } = auth;
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    console.log(`🚪 [POST /api/rooms/${roomId}/leave] Игрок ${userId} (${environment}) покидает комнату`);

    // Удаляем игрока из комнаты (используем dbUserId из БД)
    const { error: deleteError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', dbUserId);

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

    console.log(`✅ [leave] Игрок ${userId} покинул комнату ${roomId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Вы покинули комнату' 
    });

  } catch (error: unknown) {
    console.error('❌ [leave] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

