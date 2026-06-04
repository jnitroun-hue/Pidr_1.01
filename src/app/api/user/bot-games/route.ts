import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// GET /api/user/bot-games - Получить количество сыгранных игр (используем total_games)
export async function GET(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return noStoreJson({ success: false, error: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { userId, environment } = auth;
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      return noStoreJson({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    // ✅ ИСПРАВЛЕНО: учитываем все исторические поля статистики
    const user = dbUser;
    const gamesPlayed =
      user?.total_games_played ||
      user?.total_games ||
      user?.games_played ||
      0;
    const isAdmin = user?.is_admin === true;
    
    // ✅ ПРОВЕРКА ДАТЫ РЕГИСТРАЦИИ: Только для пользователей после 10.02.2026
    const tutorialCutoffDate = new Date('2026-02-10T00:00:00.000Z');
    const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;
    const isNewUser = !userCreatedAt || userCreatedAt >= tutorialCutoffDate;
    
    console.log(`📊 [GAMES] Пользователь ${userId} (${environment}): игр=${gamesPlayed}, дата регистрации=${userCreatedAt?.toISOString()}, новый=${isNewUser}`);

    return noStoreJson({
      success: true,
      gamesPlayed: gamesPlayed,
      canPlayMultiplayer: isAdmin || gamesPlayed >= 3,
      isAdmin,
      isNewUser, // ✅ НОВОЕ: Флаг нового пользователя
      showTutorial: !isAdmin && isNewUser && gamesPlayed < 3 // ✅ НОВОЕ: Показывать туториал только новым пользователям
    });

  } catch (error: unknown) {
    console.error('❌ [GAMES] Ошибка:', error);
    return noStoreJson({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

