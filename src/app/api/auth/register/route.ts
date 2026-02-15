import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/redis-session-manager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, phone, password } = body;

    // Валидация
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверка формата username
    if (username.length < 3 || username.length > 32) {
      return NextResponse.json(
        { success: false, message: 'Логин должен быть от 3 до 32 символов' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { success: false, message: 'Логин может содержать только буквы, цифры и _' },
        { status: 400 }
      );
    }

    // Проверка формата пароля
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Пароль должен быть минимум 6 символов' },
        { status: 400 }
      );
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { success: false, message: 'Пароль должен содержать заглавную букву, строчную букву и цифру' },
        { status: 400 }
      );
    }

    // Проверка формата email (если указан)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Неверный формат email' },
        { status: 400 }
      );
    }

    // Проверка формата телефона (если указан)
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'Неверный формат телефона (используйте международный формат)' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Проверяем, существует ли пользователь с таким username
    const { data: existingUser } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Пользователь с таким логином уже существует' },
        { status: 409 }
      );
    }

    // Проверяем email (если указан)
    if (email) {
      const { data: existingEmail } = await supabase
        .from('_pidr_users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Пользователь с таким email уже существует' },
          { status: 409 }
        );
      }
    }

    // Проверяем телефон (если указан)
    if (phone) {
      const { data: existingPhone } = await supabase
        .from('_pidr_users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: 'Пользователь с таким телефоном уже существует' },
          { status: 409 }
        );
      }
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const { data: newUser, error: createError } = await supabase
      .from('_pidr_users')
      .insert({
        username,
        email: email || null,
        phone: phone || null,
        password_hash: passwordHash,
        auth_method: 'local',
        coins: 1000,
        rating: 0,
        email_verified: false,
        phone_verified: false,
        is_active: true,
        login_count: 1,
        last_login_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !newUser) {
      console.error('❌ Ошибка создания пользователя:', createError);
      return NextResponse.json(
        { success: false, message: 'Ошибка создания пользователя' },
        { status: 500 }
      );
    }

    // Создаем сессию в Redis + JWT токен
    const { token } = await createSession({
      userId: newUser.id.toString(),
      username: newUser.username,
      authMethod: 'local',
      email: newUser.email || undefined,
      phone: newUser.phone || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || undefined,
    });

    // Подготавливаем данные пользователя (без пароля)
    const userData = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      phone: newUser.phone,
      coins: newUser.coins,
      rating: newUser.rating,
      avatar_url: newUser.avatar_url,
      auth_method: newUser.auth_method,
      games_played: newUser.games_played || 0,
      games_won: newUser.games_won || 0,
      wins: newUser.wins || 0,
      losses: newUser.losses || 0
    };

    console.log('✅ Пользователь успешно зарегистрирован:', username);

    const response = NextResponse.json({
      success: true,
      message: 'Регистрация успешна',
      user: userData,
      token
    });

    // ✅ ИСПРАВЛЕНО: Устанавливаем cookie с правильными настройками
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const cookieSettings = {
      httpOnly: true,
      secure: isProduction, // На Vercel всегда true
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/'
    };
    
    response.cookies.set('auth_token', token, cookieSettings);
    
    console.log('🍪 [Register] Cookie установлен:', {
      hasToken: !!token,
      tokenLength: token.length,
      settings: cookieSettings,
      isProduction,
      vercel: process.env.VERCEL
    });

    return response;

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

