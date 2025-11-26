import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// 🔴 API ДЛЯ УПРАВЛЕНИЯ ГОТОВНОСТЬЮ ИГРОКОВ
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    // ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string; // ✅ Это telegram_id
    const roomId = params.roomId;
    const body = await request.json();
    const { isReady } = body;

    console.log(`🔴 [READY API] Обновляем готовность: userId=${userId}, roomId=${roomId}, isReady=${isReady}`);
    console.log(`🔍 [READY API] userId type:`, typeof userId, 'roomId type:', typeof roomId);

    // ✅ ОБНОВЛЯЕМ ГОТОВНОСТЬ ИГРОКА (user_id это INT8, room_id это INT4)
    const { error, data } = await supabase
      .from('_pidr_room_players')
      .update({ is_ready: isReady })
      .eq('room_id', parseInt(roomId))
      .eq('user_id', parseInt(userId))
      .select();
    
    console.log(`📊 [READY API] Результат обновления:`, data, error);

    if (error) {
      console.error('❌ Ошибка обновления готовности:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления готовности: ' + error.message 
      }, { status: 500 });
    }

    // ПОЛУЧАЕМ ОБНОВЛЕННЫЙ СПИСОК ИГРОКОВ
    const { data: players, error: playersError } = await supabase
      .from('_pidr_room_players')
      .select('user_id, username, position, is_ready, avatar_url')
      .eq('room_id', roomId)
      .order('position');

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения игроков: ' + playersError.message 
      }, { status: 500 });
    }

    console.log(`✅ Готовность обновлена. Игроков: ${players?.length || 0}`);

    return NextResponse.json({ 
      success: true, 
      players: players || []
    });

  } catch (error) {
    console.error('❌ Ошибка API готовности:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// 🔍 ПОЛУЧИТЬ СТАТУС ГОТОВНОСТИ ВСЕХ ИГРОКОВ
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    // ПОЛУЧАЕМ ВСЕХ ИГРОКОВ С ИХ ГОТОВНОСТЬЮ
    const { data: players, error } = await supabase
      .from('_pidr_room_players')
      .select('user_id, username, position, is_ready, avatar_url')
      .eq('room_id', roomId)
      .order('position');

    if (error) {
      console.error('❌ Ошибка получения готовности:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения готовности: ' + error.message 
      }, { status: 500 });
    }

    const readyCount = players?.filter((p: any) => p.is_ready).length || 0;
    const totalCount = players?.length || 0;
    const allReady = readyCount === totalCount && totalCount > 1;

    console.log(`🔍 Готовность: ${readyCount}/${totalCount}, allReady=${allReady}`);

    return NextResponse.json({ 
      success: true, 
      players: players || [],
      readyCount,
      totalCount,
      allReady
    });

  } catch (error) {
    console.error('❌ Ошибка API готовности:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
