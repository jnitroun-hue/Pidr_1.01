import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/user/me - Получить данные текущего пользователя (универсально для всех платформ)
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const { userId, environment } = auth;
    
    // Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }
    
    const user = dbUser;

    // Обновляем last_seen
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    await supabaseAdmin
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', dbUserId);

    // ✅ ЛОГИРОВАНИЕ для отладки
    const totalGames = user.total_games || user.games_played || 0;
    const wins = user.games_won || user.wins || 0;
    console.log(`📊 [API /user/me] Пользователь ${userId}: total_games=${user.total_games}, games_played=${user.games_played}, games_won=${user.games_won}, wins=${user.wins}`);

    // ✅ ЛОГИРОВАНИЕ: Проверяем что приходит из БД
    console.log(`📊 [API /user/me] Данные из БД:`, {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      email: user.email,
      telegram_id: user.telegram_id
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username, // ✅ Возвращаем username как есть из БД
        firstName: user.first_name,
        lastName: user.last_name,
        avatar_url: user.avatar_url,
        telegramId: user.telegram_id,
        coins: user.coins,
        rating: user.rating,
        experience: user.experience || 0,
        games_played: totalGames,
        gamesPlayed: totalGames,
        games_won: wins,
        wins: wins,
        losses: user.losses || 0,
        best_win_streak: user.best_win_streak || 0,
        status: user.status,
        created_at: user.created_at,
        is_admin: user.is_admin || false // ✅ ДОБАВЛЕНО: is_admin
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

