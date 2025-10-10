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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
        { status: 401 }
      );
    }

    // Устанавливаем cookie с сессией
    const response = NextResponse.json({
      success: true,
      userId: result.userId,
      isNewUser: result.isNewUser,
    });

    response.cookies.set('pidr_session', result.sessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('❌ Ошибка /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

