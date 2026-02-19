/**
 * POST /api/auth/link
 * Связывание нового метода авторизации с текущим аккаунтом
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/auth-middleware';
import { linkAuthMethod, type AuthProvider } from '../../../../lib/auth/universal-auth';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAuth(request);

    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { error: authContext.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { method, providerUserId, providerEmail, providerData } = body;

    if (!method || !providerUserId) {
      return NextResponse.json(
        { error: 'Недостаточно параметров' },
        { status: 400 }
      );
    }

    const result = await linkAuthMethod({
      userId: authContext.userId,
      authProvider: method as AuthProvider,
      providerUserId,
      providerEmail,
      providerData,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Ошибка связывания' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      authMethodId: result.authMethodId,
    });
  } catch (error: any) {
    console.error('❌ Ошибка /api/auth/link:', error);
    return NextResponse.json(
      { error: 'Ошибка связывания метода' },
      { status: 500 }
    );
  }
}

