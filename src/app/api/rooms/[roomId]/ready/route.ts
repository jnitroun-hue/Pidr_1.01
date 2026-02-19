import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🔴 API ДЛЯ УПРАВЛЕНИЯ ГОТОВНОСТЬЮ ИГРОКОВ
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { userId, environment } = auth;
    const roomId = params.roomId;
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }
    
    // ✅ ИСПРАВЛЕНО: Безопасный парсинг body с обработкой ошибок
    let body: any = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch (error: unknown) {
      console.error('❌ [READY API] Ошибка парсинга body:', error);
      // Если body пустой, определяем isReady из текущего состояния
      const { data: currentPlayer } = await supabase
        .from('_pidr_room_players')
        .select('is_ready')
        .eq('room_id', parseInt(roomId))
        .eq('user_id', parseInt(userId))
        .maybeSingle();
      
      body.isReady = !currentPlayer?.is_ready; // Переключаем состояние
      console.log('⚠️ [READY API] Body пустой, переключаем готовность:', body.isReady);
    }
    
    const { isReady } = body;

    console.log(`🔴 [READY API] Обновляем готовность: userId=${userId}, roomId=${roomId}, isReady=${isReady}`);
    console.log(`🔍 [READY API] userId type:`, typeof userId, 'roomId type:', typeof roomId);

    // ✅ ОБНОВЛЯЕМ ГОТОВНОСТЬ ИГРОКА (user_id это BIGINT из БД)
    const { error, data } = await supabase
      .from('_pidr_room_players')
      .update({ is_ready: isReady })
      .eq('room_id', parseInt(roomId))
      .eq('user_id', dbUserId)
      .select();
    
    console.log(`📊 [READY API] Результат обновления:`, data, error);

    if (error) {
      console.error('❌ Ошибка обновления готовности:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления готовности: ' + (error instanceof Error ? error.message : String(error)) 
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
    
    // ✅ ОБНОВЛЯЕМ last_activity КОМНАТЫ
    await supabase
      .from('_pidr_rooms')
      .update({ 
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(roomId));

    return NextResponse.json({ 
      success: true, 
      players: players || [],
      isReady // ✅ ВОЗВРАЩАЕМ НОВОЕ СОСТОЯНИЕ
    });

  } catch (error: unknown) {
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
        message: 'Ошибка получения готовности: ' + (error instanceof Error ? error.message : String(error)) 
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

  } catch (error: unknown) {
    console.error('❌ Ошибка API готовности:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
