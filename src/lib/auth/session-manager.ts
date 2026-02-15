import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface AuthLogEntry {
  userId: string;
  action: 'login' | 'logout' | 'token_refresh' | 'token_revoke' | 'session_cleanup';
    authType: 'telegram' | 'web' | 'google' | 'vk' | 'system';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  sessionId?: string;
}

/**
 * ✅ УПРОЩЁННЫЙ SessionManager - работает только через JWT, без БД
 * Таблица _pidr_user_sessions удалена
 */
export class SessionManager {
  
  /**
   * Создает новую сессию и JWT токен
   * ✅ УПРОЩЕНО: Без сохранения в БД
   */
  static async createSession(
    userId: string, 
    authType: string,
    userInfo: any,
    request?: {
      ip?: string;
      userAgent?: string;
      deviceInfo?: any;
    }
  ): Promise<{ token: string; sessionId: string } | null> {
    
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET не настроен');
      return null;
    }

    try {
      // Генерируем уникальный ID сессии
      const sessionId = crypto.randomUUID();
      
      // Создаем JWT токен с информацией о сессии
      const tokenPayload = {
        userId,
        username: userInfo.username,
        type: authType,
        sessionId
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

      console.log(`✅ Сессия создана: ${sessionId} для пользователя ${userId}`);

      return { 
        token, 
        sessionId 
      };
      
    } catch (error) {
      console.error('❌ Ошибка создания сессии:', error);
      return null;
    }
  }

  /**
   * Валидирует JWT токен
   * ✅ УПРОЩЕНО: Проверяем только JWT, без БД
   */
  static async validateToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    sessionId?: string;
    error?: string;
  }> {
    if (!JWT_SECRET) {
      return { valid: false, error: 'JWT_SECRET не настроен' };
    }

    try {
      // Проверяем JWT
      const payload = jwt.verify(token, JWT_SECRET) as any;

      // Проверяем истек ли токен
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Токен истек' };
      }

      return {
        valid: true,
        userId: payload.userId,
        sessionId: payload.sessionId
      };
      
    } catch (error: any) {
      console.error('❌ Ошибка валидации токена:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Отзывает сессию (logout)
   * ✅ УПРОЩЕНО: Просто логируем, без БД
   */
  static async revokeSession(sessionId: string, reason?: string): Promise<boolean> {
    try {
      console.log(`✅ Сессия ${sessionId} отозвана${reason ? `: ${reason}` : ''}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отзыва сессии:', error);
      return false;
    }
  }

  /**
   * Логирование действий авторизации
   * ✅ УПРОЩЕНО: Только console.log, без БД
   */
  static async logAuthAction(entry: AuthLogEntry): Promise<void> {
    try {
      console.log(`🔐 [AUTH] ${entry.action.toUpperCase()}: user=${entry.userId}, type=${entry.authType}, success=${entry.success}`);
    } catch (error) {
      console.error('❌ Ошибка логирования:', error);
    }
  }

  /**
   * Получает активные сессии пользователя
   * ✅ УПРОЩЕНО: Возвращаем пустой массив (сессии не хранятся в БД)
   */
  static async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    console.log(`ℹ️ [SESSION] Сессии хранятся только в JWT токенах, БД не используется`);
    return [];
  }
}
