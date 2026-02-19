import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

/**
 * GET /api/friends/list
 * Получить список друзей пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('❌ [FRIENDS LIST] Supabase admin client не инициализирован');
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const auth = requireAuth(request);

    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId || !dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUserTelegramId = dbUser.telegram_id;

    console.log(`👥 [FRIENDS LIST] Загрузка друзей для telegram_id: ${currentUserTelegramId}`);

    // Получаем друзей из БД
    const { data: friendships, error } = await supabase
      .from('_pidr_friends')
      .select(`
        friend_id,
        created_at
      `)
      .eq('user_id', String(currentUserTelegramId))
      .eq('status', 'accepted');
    
    console.log(`📊 [FRIENDS LIST] Найдено дружб: ${friendships?.length || 0}`, friendships);

    if (error) {
      console.error('❌ [FRIENDS LIST] Ошибка получения друзей:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Получаем данные друзей
    const friendIds = friendships?.map((f: any) => f.friend_id) || [];
    
    console.log(`🔍 [FRIENDS LIST] Получаем данные для friend_ids:`, friendIds);
    
    if (friendIds.length === 0) {
      console.log(`ℹ️ [FRIENDS LIST] Нет друзей для пользователя ${userId}`);
      return NextResponse.json({
        success: true,
        friends: []
      });
    }

    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    const { data: friends, error: friendsError } = await supabase
      .from('_pidr_users')
      .select('telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, online_status, last_seen')
      .in('telegram_id', friendIds);
    
    console.log(`👥 [FRIENDS LIST] Данные друзей получены:`, friends?.length, friends);

    if (friendsError) {
      console.error('❌ Ошибка получения данных друзей:', friendsError);
      return NextResponse.json(
        { success: false, error: friendsError.message },
        { status: 500 }
      );
    }

    // ✅ Формируем правильный статус (приоритет online_status)
    const formattedFriends = (friends || []).map((f: any) => ({
      ...f,
      status: f.online_status || f.status || 'offline'
    }));

    console.log(`✅ [FRIENDS LIST] Список друзей получен: ${formattedFriends.length}`);

    return NextResponse.json({
      success: true,
      friends: formattedFriends
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/friends/list:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

