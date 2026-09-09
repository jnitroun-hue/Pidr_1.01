import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/redis-session-manager';
import { setAuthCookies, resolveAuthCookieOptions } from '@/lib/auth/auth-cookies';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, phone, password, type = 'web' } = body;

    // Валидация
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Пароль обязателен' },
        { status: 400 }
      );
    }

    if (!username && !email && !phone) {
      return NextResponse.json(
        { success: false, message: 'Укажите логин, email или телефон' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ ИСПРАВЛЕНО: Ищем пользователя по логину, email или телефону
    // Убираем фильтры по auth_method и is_active для старых пользователей
    // Сначала ищем по username/email/phone без фильтров
    let query = supabase
      .from('_pidr_users')
      .select('*');

    if (username) {
      query = query.eq('username', username);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: user, error: userError } = await query.maybeSingle();

    if (userError || !user) {
      console.log('❌ Пользователь не найден:', userError?.message || 'Не найден');
      return NextResponse.json(
        { success: false, message: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // ✅ ПРОВЕРЯЕМ: Если у пользователя нет password_hash - это старый пользователь (Telegram/VK)
    if (!user.password_hash) {
      console.log('❌ У пользователя нет пароля (возможно, это Telegram/VK пользователь)');
      return NextResponse.json(
        { success: false, message: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Неверный пароль');
      return NextResponse.json(
        { success: false, message: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Обновляем статистику входа
    await supabase
      .from('_pidr_users')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: (user.login_count || 0) + 1,
        online_status: 'online',
        status: 'online',
        last_seen: new Date().toISOString()
      })
      .eq('id', user.id);

    // Создаем сессию в Redis + JWT токен
    const { token } = await createSession({
      userId: user.id.toString(),
      username: user.username,
      authMethod: 'web',
      email: user.email || undefined,
      phone: user.phone || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || undefined,
    });

    // Подготавливаем данные пользователя (без пароля)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      coins: user.coins,
      rating: user.rating,
      avatar_url: user.avatar_url,
      auth_method: user.auth_method,
      games_played: user.games_played || 0,
      games_won: user.games_won || 0,
      wins: user.wins || 0,
      losses: user.losses || 0,
      ton_wallet_address: user.ton_wallet_address
    };

    console.log('✅ Успешный вход:', user.username);

    const response = NextResponse.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: userData,
      token
    });
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    const cookieSettings = resolveAuthCookieOptions();
    
    setAuthCookies(response, token, cookieSettings);
    
    console.log('🍪 [Login] Cookie установлен:', {
      hasToken: !!token,
      tokenLength: token.length,
      settings: cookieSettings,
    });

    return response;

  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
