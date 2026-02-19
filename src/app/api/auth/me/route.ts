/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/auth-middleware';
import { getUserAuthMethods } from '../../../../lib/auth/universal-auth';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAuth(request);

    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { error: authContext.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    // Получаем методы авторизации пользователя
    const authMethods = await getUserAuthMethods(authContext.userId);

    return NextResponse.json({
      success: true,
      user: authContext.user,
      authMethods,
    });
  } catch (error: any) {
    console.error('❌ Ошибка /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Ошибка получения данных пользователя' },
      { status: 500 }
    );
  }
}

