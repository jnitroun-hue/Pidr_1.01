/**
 * ============================================================
 * SESSION MIDDLEWARE
 * ============================================================
 * Middleware для проверки и валидации сессий
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, updateSessionActivity } from './redis-session-manager';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    username: string;
    authMethod: string;
  };
}

/**
 * Middleware для проверки авторизации
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Получаем токен из заголовка или cookie
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth_token')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    // Валидируем сессию
    const validation = await validateSession(token);

    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { success: false, message: 'Недействительная сессия', error: validation.error },
        { status: 401 }
      );
    }

    // Добавляем данные пользователя в request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = {
      userId: validation.session.userId,
      username: validation.session.username,
      authMethod: validation.session.authMethod,
    };

    // Вызываем handler
    return await handler(authenticatedRequest);

  } catch (error) {
    console.error('❌ Ошибка middleware авторизации:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка проверки авторизации' },
      { status: 500 }
    );
  }
}

/**
 * Опциональная авторизация (не требует токен, но проверяет если есть)
 */
export async function optionalAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth_token')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    if (token) {
      const validation = await validateSession(token);

      if (validation.valid && validation.session) {
        const authenticatedRequest = request as AuthenticatedRequest;
        authenticatedRequest.user = {
          userId: validation.session.userId,
          username: validation.session.username,
          authMethod: validation.session.authMethod,
        };
      }
    }

    return await handler(request as AuthenticatedRequest);

  } catch (error) {
    console.error('❌ Ошибка optional auth middleware:', error);
    return await handler(request as AuthenticatedRequest);
  }
}

/**
 * Rate limiting middleware (использует существующий ratelimit)
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  identifier?: string
): Promise<NextResponse> {
  try {
    const { checkRateLimit, getRateLimitId } = await import('../ratelimit');
    
    const id = identifier || getRateLimitId(request);
    const { success } = await checkRateLimit(id);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      );
    }

    return await handler(request);

  } catch (error) {
    console.error('❌ Ошибка rate limit middleware:', error);
    return await handler(request);
  }
}

