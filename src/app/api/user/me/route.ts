import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase';

// GET /api/user/me - Получить данные текущего пользователя из pidr_session
export async function GET(req: NextRequest) {
  try {
    console.log('👤 [/api/user/me] Запрос данных пользователя...');

    // Читаем pidr_session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pidr_session');

    if (!sessionCookie?.value) {
      console.log('❌ [/api/user/me] pidr_session не найдена');
      return NextResponse.json(
        { success: false, message: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Парсим сессию
    let sessionData: any;
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch (parseError) {
      console.error('❌ [/api/user/me] Ошибка парсинга сессии:', parseError);
      return NextResponse.json(
        { success: false, message: 'Невалидная сессия' },
        { status: 401 }
      );
    }

    // Извлекаем userId из сессии
    const userId =
      sessionData.userId ||
      sessionData.user_id ||
      sessionData.telegramId ||
      sessionData.telegram_id ||
      sessionData.id;

    if (!userId) {
      console.log('❌ [/api/user/me] userId не найден в сессии');
      return NextResponse.json(
        { success: false, message: 'Невалидная сессия' },
        { status: 401 }
      );
    }

    console.log('✅ [/api/user/me] userId из сессии:', userId);

    // Ищем пользователя в БД
    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('❌ [/api/user/me] Пользователь не найден в БД:', error);
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }

    console.log('✅ [/api/user/me] Пользователь найден:', user.username);

    // Обновляем last_seen
    await supabase
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', userId);

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
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        status: user.status
      }
    });
  } catch (error: any) {
    console.error('❌ [/api/user/me] Ошибка:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

