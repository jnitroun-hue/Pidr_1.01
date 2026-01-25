/**
 * Универсальный Auth Middleware
 * Поддержка всех методов аутентификации
 */

import { NextRequest } from 'next/server';
import { validateSession, getUserById } from './universal-auth';

export interface AuthContext {
  authenticated: boolean;
  userId?: number;
  user?: any;
  sessionToken?: string;
  authMethod?: string;
  error?: string;
}

/**
 * Извлечение токена из различных источников
 */
function extractToken(request: NextRequest): string | null {
  // 1. Проверяем Cookie (основной способ)
  const cookieToken = request.cookies.get('pidr_session')?.value;
  if (cookieToken) return cookieToken;

  // 2. Проверяем Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Проверяем X-Session-Token header (для API клиентов)
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) return sessionHeader;

  return null;
}

/**
 * Универсальная проверка аутентификации
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  try {
    const sessionToken = extractToken(request);

    if (!sessionToken) {
      return {
        authenticated: false,
        error: 'Токен сессии не найден',
      };
    }

    // Валидируем сессию
    const sessionResult = await validateSession(sessionToken);

    if (!sessionResult.isValid || !sessionResult.userId) {
      return {
        authenticated: false,
        error: 'Сессия недействительна или истекла',
      };
    }

    // Получаем данные пользователя
    const user = await getUserById(sessionResult.userId);

    if (!user) {
      return {
        authenticated: false,
        error: 'Пользователь не найден',
      };
    }

    // Проверяем статус аккаунта
    if (user.account_status !== 'active') {
      return {
        authenticated: false,
        error: `Аккаунт ${user.account_status}`,
      };
    }

    return {
      authenticated: true,
      userId: user.id,
      user,
      sessionToken,
      authMethod: user.primary_auth_method,
    };
  } catch (error: any) {
    console.error('❌ Ошибка middleware аутентификации:', error);
    return {
      authenticated: false,
      error: 'Ошибка проверки аутентификации',
    };
  }
}

/**
 * Опциональная аутентификация (не требует обязательного входа)
 */
export async function optionalAuth(request: NextRequest): Promise<AuthContext> {
  const sessionToken = extractToken(request);

  if (!sessionToken) {
    return { authenticated: false };
  }

  return await requireAuth(request);
}

/**
 * Проверка роли/прав пользователя (для будущего расширения)
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthContext> {
  const authContext = await requireAuth(request);

  if (!authContext.authenticated) {
    return authContext;
  }

  // TODO: Добавить систему ролей в БД
  const userRole = authContext.user?.role || 'user';

  if (!allowedRoles.includes(userRole)) {
    return {
      ...authContext,
      authenticated: false,
      error: 'Недостаточно прав',
    };
  }

  return authContext;
}

/**
 * Middleware для API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AuthContext) => Promise<Response>
): Promise<Response> {
  const authContext = await requireAuth(request);

  if (!authContext.authenticated) {
    return new Response(
      JSON.stringify({ error: authContext.error || 'Не авторизован' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return handler(request, authContext);
}

/**
 * Middleware с опциональной аутентификацией
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AuthContext) => Promise<Response>
): Promise<Response> {
  const authContext = await optionalAuth(request);
  return handler(request, authContext);
}

