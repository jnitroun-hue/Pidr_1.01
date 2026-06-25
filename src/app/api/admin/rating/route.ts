import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/admin-utils';
import { resolveAuthMethod } from '@/lib/user/resolve-auth-method';
import { normalizeUserStats } from '@/lib/user/normalize-user-stats';

// GET /api/admin/rating - Получить рейтинг пользователей для админа
export async function GET(req: NextRequest) {
  try {
    // Проверка прав администратора
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    // Получаем параметры пагинации
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Загружаем пользователей с рейтингом (реальные колонки из БД)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, telegram_id, vk_id, username, first_name, last_name, rating, games_played, total_games, total_games_played, games_won, wins, losses, coins, avatar_url, auth_method, created_at')
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error('❌ Ошибка загрузки рейтинга:', usersError);
      return NextResponse.json({ success: false, error: usersError.message }, { status: 500 });
    }

    // Получаем общее количество пользователей
    const { count } = await supabaseAdmin
      .from('_pidr_users')
      .select('*', { count: 'exact', head: true });

    // Обогащаем данные о пользователях
    const ratingData = (users || []).map((user: Record<string, unknown>, index: number) => {
      const stats = normalizeUserStats(user);
      return {
      rank: offset + index + 1,
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username || user.first_name || 'Без имени',
      rating: user.rating || 0,
      games_played: stats.gamesPlayed,
      games_won: stats.wins,
      losses: stats.losses,
      win_rate: stats.winRate,
      coins: user.coins || 0,
      avatar_url: user.avatar_url || null,
      auth_method: resolveAuthMethod(user),
      created_at: user.created_at
    };
    });

    return NextResponse.json({
      success: true,
      rating: ratingData,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        total: count || 0
      }
    });
  } catch (error: any) {
    console.error('❌ Ошибка получения рейтинга:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
