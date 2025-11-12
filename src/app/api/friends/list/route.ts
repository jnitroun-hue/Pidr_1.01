import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/friends/list
 * Получить список друзей пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const telegramId = request.headers.get('x-telegram-id');
    
    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramId);

    // Получаем друзей из БД
    const { data: friendships, error } = await supabase
      .from('_pidr_friendships')
      .select(`
        friend_id,
        created_at
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('❌ Ошибка получения друзей:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Получаем данные друзей
    const friendIds = friendships?.map(f => f.friend_id) || [];
    
    if (friendIds.length === 0) {
      return NextResponse.json({
        success: true,
        friends: []
      });
    }

    const { data: friends, error: friendsError } = await supabase
      .from('_pidr_users')
      .select('telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, last_seen')
      .in('telegram_id', friendIds);

    if (friendsError) {
      console.error('❌ Ошибка получения данных друзей:', friendsError);
      return NextResponse.json(
        { success: false, error: friendsError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Список друзей получен: ${friends?.length} друзей`);

    return NextResponse.json({
      success: true,
      friends: friends || []
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/friends/list:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

