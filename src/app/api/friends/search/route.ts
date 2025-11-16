import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/friends/search?query=username
 * Поиск пользователей по имени/username
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const telegramId = request.headers.get('x-telegram-id');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        users: []
      });
    }

    const currentUserId = telegramId ? parseInt(telegramId) : null;

    console.log(`🔍 [FRIENDS SEARCH] Поиск по запросу: "${query}", текущий пользователь: ${currentUserId}`);

    // ✅ ПОИСК ПО USERNAME (даже с 1 буквой) - приоритет username
    const { data: users, error } = await supabase
      .from('_pidr_users')
      .select('telegram_id, username, first_name, avatar_url, rating, games_played, wins')
      .ilike('username', `%${query}%`) // Поиск по username (даже с 1 буквой)
      .neq('telegram_id', currentUserId || 0) // Исключаем себя
      .limit(20); // Увеличиваем лимит для лучших результатов

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

