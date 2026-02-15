import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

/**
 * GET /api/friends/search?query=username
 * Поиск пользователей по имени/username
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('❌ [FRIENDS SEARCH] Supabase admin client не инициализирован');
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        users: []
      });
    }

    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию (опционально для поиска)
    const auth = requireAuth(request);
    let currentUserTelegramId: string | null = null;
    
    if (auth.userId && !auth.error) {
      const { userId, environment } = auth;
      const { user: dbUser } = await getUserIdFromDatabase(userId, environment);
      if (dbUser) {
        currentUserTelegramId = dbUser.telegram_id;
      }
    }

    console.log(`🔍 [FRIENDS SEARCH] Поиск по запросу: "${query}", текущий пользователь (telegram_id): ${currentUserTelegramId || 'не авторизован'}`);

    // ✅ ПОИСК ПО USERNAME (даже с 1 буквой) - приоритет username
    let usersQuery = supabase
      .from('_pidr_users')
      .select('telegram_id, username, first_name, avatar_url, rating, games_played, wins')
      .ilike('username', `%${query}%`) // Поиск по username (даже с 1 буквой)
      .limit(20); // Увеличиваем лимит для лучших результатов
    
    // ✅ Исключаем себя если есть telegramId
    if (currentUserTelegramId) {
      usersQuery = usersQuery.neq('telegram_id', currentUserTelegramId);
    }
    
    const { data: users, error } = await usersQuery;

    if (error) {
      console.error('❌ Ошибка поиска пользователей:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Найдено пользователей: ${users?.length}`, users);

    return NextResponse.json({
      success: true,
      users: users || []
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/friends/search:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

