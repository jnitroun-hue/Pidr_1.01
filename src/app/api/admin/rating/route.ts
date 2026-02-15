import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// GET /api/admin/rating - Получить рейтинг пользователей для админа
export async function GET(req: NextRequest) {
  try {
    // Проверка прав администратора
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    // Проверяем, является ли пользователь админом
    const { data: user } = await supabase
      .from('_pidr_users')
      .select('is_admin')
      .or(`telegram_id.eq.${auth.userId},id.eq.${auth.userId}`)
      .single();

    if (!user || !user.is_admin) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    // Получаем параметры пагинации
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Загружаем пользователей с рейтингом
    const { data: users, error: usersError } = await supabase
      .from('_pidr_users')
      .select('id, telegram_id, username, first_name, last_name, rating, games_played, games_won, wins, losses, coins, created_at')
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error('❌ Ошибка загрузки рейтинга:', usersError);
      return NextResponse.json({ success: false, error: usersError.message }, { status: 500 });
    }

    // Получаем общее количество пользователей
    const { count } = await supabase
      .from('_pidr_users')
      .select('*', { count: 'exact', head: true });

    // Обогащаем данные о пользователях
    const ratingData = (users || []).map((user: any, index: number) => ({
      rank: offset + index + 1,
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username || user.first_name || 'Без имени',
      rating: user.rating || 0,
      games_played: user.games_played || 0,
      games_won: user.games_won || user.wins || 0,
      losses: user.losses || 0,
      win_rate: user.games_played > 0 
        ? Math.round(((user.games_won || user.wins || 0) / user.games_played) * 100)
        : 0,
      coins: user.coins || 0,
      created_at: user.created_at
    }));

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

