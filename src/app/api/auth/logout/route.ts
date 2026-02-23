/**
 * POST /api/auth/logout
 * Выход из системы (инвалидация сессии)
 */

import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '../../../../lib/auth/universal-auth';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('pidr_session')?.value;

    if (sessionToken) {
      await invalidateSession(sessionToken);
    }

    const response = NextResponse.json({ success: true });
    
    // ✅ Удаляем оба возможных cookie (auth_token и pidr_session)
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.cookies.delete('pidr_session');

    return response;
  } catch (error: any) {
    console.error('❌ Ошибка /api/auth/logout:', error);
    return NextResponse.json(
      { error: 'Ошибка выхода' },
      { status: 500 }
    );
  }
}

