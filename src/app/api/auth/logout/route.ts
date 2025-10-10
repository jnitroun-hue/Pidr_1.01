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
    
    // Удаляем cookie
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

