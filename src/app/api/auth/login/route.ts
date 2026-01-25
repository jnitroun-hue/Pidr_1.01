<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/redis-session-manager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
=======
/**
 * POST /api/auth/login
 * Универсальный endpoint для входа через любой метод
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateUser,
  authenticateTelegramWebApp,
  authenticateGoogle,
  authenticateVK,
  type AuthProvider,
} from '../../../../lib/auth/universal-auth';
import jwt from 'jsonwebtoken';
>>>>>>> 23a978722cf8d61908043d26b8e399bb35c8fe1d

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
<<<<<<< HEAD
    const { username, email, phone, password, type = 'local' } = body;

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

    // Ищем пользователя по логину, email или телефону
    let query = supabase
      .from('_pidr_users')
      .select('*')
      .eq('auth_method', 'local')
      .eq('is_active', true);

    if (username) {
      query = query.eq('username', username);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: user, error: userError } = await query.single();

    if (userError || !user) {
      console.log('❌ Пользователь не найден');
      return NextResponse.json(
        { success: false, message: 'Неверный логин или пароль' },
=======
    const { method, ...authData } = body;

    let result;

    switch (method as AuthProvider) {
      case 'telegram':
        // Telegram Web App
        if (authData.initData) {
          result = await authenticateTelegramWebApp(authData.initData);
        } else {
          result = await authenticateUser({
            authProvider: 'telegram',
            providerUserId: authData.telegramId,
            username: authData.username,
            avatarUrl: authData.avatarUrl,
            providerData: authData.providerData,
          });
        }
        break;

      case 'google':
        // Google OAuth
        result = await authenticateGoogle(authData.googleToken);
        break;

      case 'vk':
        // VK OAuth
        result = await authenticateVK(authData.vkAccessToken);
        break;

      case 'email':
        // Email/Password (TODO: реализовать)
        return NextResponse.json(
          { error: 'Email авторизация пока не реализована' },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: 'Неизвестный метод авторизации' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Ошибка авторизации' },
>>>>>>> 23a978722cf8d61908043d26b8e399bb35c8fe1d
        { status: 401 }
      );
    }

<<<<<<< HEAD
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
      authMethod: 'local',
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

    // Устанавливаем cookie с токеном
    response.cookies.set('auth_token', token, {
=======
    // Устанавливаем cookie с сессией
    const response = NextResponse.json({
      success: true,
      userId: result.userId,
      isNewUser: result.isNewUser,
    });

    response.cookies.set('pidr_session', result.sessionToken!, {
>>>>>>> 23a978722cf8d61908043d26b8e399bb35c8fe1d
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
<<<<<<< HEAD
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
=======
      path: '/',
    });

    // ✅ ИСПРАВЛЕНО: Также устанавливаем auth_token (JWT) для совместимости с /api/auth
    const JWT_SECRET = process.env.JWT_SECRET;
    if (JWT_SECRET && result.userId) {
      const token = jwt.sign(
        { 
          userId: result.userId.toString(),
          username: 'user' // Будет обновлено при следующем запросе
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const, // Для Telegram WebApp нужно 'none'
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 дней
      });

      console.log('✅ [Auth Login] Установлены cookies: pidr_session + auth_token');
    }

    return response;
  } catch (error: any) {
    console.error('❌ Ошибка /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
>>>>>>> 23a978722cf8d61908043d26b8e399bb35c8fe1d
      { status: 500 }
    );
  }
}
<<<<<<< HEAD
=======

>>>>>>> 23a978722cf8d61908043d26b8e399bb35c8fe1d
