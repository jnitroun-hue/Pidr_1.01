import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../../lib/supabase';

// GET /api/user/me - Получить данные текущего пользователя из pidr_session ИЛИ headers
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;

    const telegramIdHeader = req.headers.get('x-telegram-id');
    if (telegramIdHeader) {
      userId = telegramIdHeader;
    } else {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('pidr_session');

      if (sessionCookie?.value) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          userId = sessionData.userId ||
            sessionData.user_id ||
            sessionData.telegramId ||
            sessionData.telegram_id ||
            sessionData.id;
        } catch (parseError) {
          // Невалидная сессия - игнорируем
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    // Ищем пользователя в БД по telegram_id
    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }

    // Обновляем last_seen
    await supabase
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('telegram_id', userId);

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
        wins: user.wins,           // ✅ ИСПРАВЛЕНО: wins вместо games_won!
        losses: user.losses,       // ✅ ДОБАВЛЕНО: losses из БД
        status: user.status
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

