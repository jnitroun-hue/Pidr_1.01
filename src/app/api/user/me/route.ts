import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';

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
    await supabase
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('telegram_id', userId);

    // ✅ ЛОГИРОВАНИЕ для отладки
    const totalGames = user.total_games || user.games_played || 0;
    const wins = user.wins || 0;
    console.log(`📊 [API /user/me] Пользователь ${userId}: total_games=${user.total_games}, games_played=${user.games_played}, wins=${user.wins}, losses=${user.losses}`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar_url: user.avatar_url,
        telegramId: user.telegram_id,
        coins: user.coins,
        rating: user.rating,
        experience: user.experience || 0,
        games_played: totalGames,
        gamesPlayed: totalGames,
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

