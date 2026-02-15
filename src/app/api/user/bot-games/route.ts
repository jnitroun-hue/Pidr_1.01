import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/user/bot-games - Получить количество сыгранных игр (используем total_games)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;

    // ✅ ИСПРАВЛЕНО: Получаем total_games И created_at для проверки даты регистрации
    // Используем админский клиент для обхода RLS
    const { data: user, error } = await (supabaseAdmin || supabase)
      .from('_pidr_users')
      .select('total_games, created_at')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      console.error('❌ [GAMES] Ошибка получения данных:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка получения данных' 
      }, { status: 500 });
    }

    const gamesPlayed = user?.total_games || 0;
    
    // ✅ ПРОВЕРКА ДАТЫ РЕГИСТРАЦИИ: Только для пользователей после 10.02.2026
    const tutorialCutoffDate = new Date('2026-02-10T00:00:00.000Z');
    const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;
    const isNewUser = userCreatedAt && userCreatedAt >= tutorialCutoffDate;
    
    console.log(`📊 [GAMES] Пользователь ${userId}: игр=${gamesPlayed}, дата регистрации=${userCreatedAt?.toISOString()}, новый=${isNewUser}`);

    return NextResponse.json({
      success: true,
      gamesPlayed: gamesPlayed,
      canPlayMultiplayer: gamesPlayed >= 3,
      isNewUser: isNewUser, // ✅ НОВОЕ: Флаг нового пользователя
      showTutorial: isNewUser && gamesPlayed < 3 // ✅ НОВОЕ: Показывать туториал только новым пользователям
    });

  } catch (error: any) {
    console.error('❌ [GAMES] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

