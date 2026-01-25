import { NextRequest, NextResponse } from 'next/server';
import { 
  validateSession, 
  getUserSessions, 
  revokeSession, 
  revokeAllUserSessions,
  isRedisAvailable 
} from '@/lib/auth/redis-session-manager';

/**
 * GET /api/auth/sessions - Получить все активные сессии пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Токен не предоставлен' },
        { status: 401 }
      );
    }

    // Валидируем токен
    const validation = await validateSession(token);

    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { success: false, message: 'Недействительный токен' },
        { status: 401 }
      );
    }

    // Получаем все сессии пользователя
    const sessions = await getUserSessions(validation.session.userId);

    // Проверяем доступность Redis
    const redisStatus = await isRedisAvailable();

    return NextResponse.json({
      success: true,
      sessions: sessions.map(s => ({
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
        deviceInfo: s.deviceInfo,
        authMethod: s.authMethod,
        isCurrent: s.createdAt === validation.session!.createdAt
      })),
      redisAvailable: redisStatus,
      totalSessions: sessions.length
    });

  } catch (error) {
    console.error('❌ Ошибка получения сессий:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/sessions - Отозвать сессии
 * Query params:
 * - all=true - отозвать все сессии кроме текущей
 * - token=xxx - отозвать конкретную сессию по токену
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const currentToken = authHeader?.replace('Bearer ', '');

    if (!currentToken) {
      return NextResponse.json(
        { success: false, message: 'Токен не предоставлен' },
        { status: 401 }
      );
    }

    // Валидируем текущий токен
    const validation = await validateSession(currentToken);

    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { success: false, message: 'Недействительный токен' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const revokeAll = searchParams.get('all') === 'true';
    const targetToken = searchParams.get('token');

    if (revokeAll) {
      // Отзываем все сессии пользователя
      const success = await revokeAllUserSessions(validation.session.userId);

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Все сессии отозваны'
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Не удалось отозвать сессии (Redis недоступен)' },
          { status: 500 }
        );
      }
    } else if (targetToken) {
      // Отзываем конкретную сессию
      const success = await revokeSession(targetToken);

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Сессия отозвана'
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Не удалось отозвать сессию' },
          { status: 500 }
        );
      }
    } else {
      // Отзываем текущую сессию (logout)
      const success = await revokeSession(currentToken);

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Выход выполнен успешно'
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Не удалось выйти' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('❌ Ошибка отзыва сессий:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

