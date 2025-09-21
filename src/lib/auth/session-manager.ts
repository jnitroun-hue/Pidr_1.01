import { supabase } from '../supabase';
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
  authType: 'telegram' | 'local' | 'google' | 'vk' | 'system';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  sessionId?: string;
}

export class SessionManager {
  
  /**
   * Создает новую сессию и JWT токен
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
      // 1. Создаем JWT токен
      const tokenPayload = {
        userId,
        username: userInfo.username,
        type: authType,
        sessionId: crypto.randomUUID() // уникальный ID сессии
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const sessionToken = crypto.randomUUID();

      // 2. Сохраняем сессию в БД
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 дней

      const { data: session, error } = await supabase
        .from('_pidr_user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          jwt_token_hash: tokenHash,
          device_info: request?.deviceInfo || null,
          ip_address: request?.ip || null,
          user_agent: request?.userAgent || null,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Ошибка создания сессии:', error);
        return null;
      }

      // 3. Логируем вход
      await this.logAuthAction({
        userId,
        action: 'login',
        authType: authType as any,
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
        success: true,
        sessionId: session.id.toString()
      });

      console.log(`✅ Сессия создана: ${session.id} для пользователя ${userId}`);

      return { 
        token, 
        sessionId: session.id.toString() 
      };

    } catch (error) {
      console.error('❌ Ошибка создания сессии:', error);
      
      // Логируем неудачную попытку
      await this.logAuthAction({
        userId,
        action: 'login',
        authType: authType as any,
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
        success: false,
        errorMessage: (error as Error).message
      });

      return null;
    }
  }

  /**
   * Проверяет валидность токена и сессии
   */
  static async validateSession(token: string): Promise<{
    valid: boolean;
    userId?: string;
    sessionId?: string;
    payload?: any;
  }> {
    
    if (!JWT_SECRET) {
      return { valid: false };
    }

    try {
      // 1. Проверяем JWT токен
      const payload = jwt.verify(token, JWT_SECRET) as any;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // 2. Проверяем сессию в БД
      const { data: session, error } = await supabase
        .from('_pidr_user_sessions')
        .select('id, user_id, is_active, expires_at')
        .eq('jwt_token_hash', tokenHash)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        console.warn('⚠️ Сессия не найдена в БД для токена');
        return { valid: false };
      }

      // 3. Проверяем срок действия
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (expiresAt < now) {
        console.warn('⚠️ Сессия истекла');
        // Деактивируем истекшую сессию
        await this.revokeSession(session.id.toString(), 'Сессия истекла');
        return { valid: false };
      }

      // 4. Обновляем время последней активности
      await supabase
        .from('_pidr_user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', session.id);

      return {
        valid: true,
        userId: session.user_id.toString(),
        sessionId: session.id.toString(),
        payload
      };

    } catch (error) {
      console.warn('⚠️ Ошибка валидации токена:', error);
      return { valid: false };
    }
  }

  /**
   * Отзывает сессию (logout)
   */
  static async revokeSession(sessionId: string, reason?: string): Promise<boolean> {
    try {
      const { data: session, error: fetchError } = await supabase
        .from('_pidr_user_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (fetchError || !session) {
        console.warn('⚠️ Сессия не найдена для отзыва:', sessionId);
        return false;
      }

      // Деактивируем сессию
      const { error } = await supabase
        .from('_pidr_user_sessions')
        .update({ 
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Ошибка отзыва сессии:', error);
        return false;
      }

      // Логируем выход
      await this.logAuthAction({
        userId: session.user_id.toString(),
        action: 'logout',
        authType: 'system',
        success: true,
        errorMessage: reason,
        sessionId
      });

      console.log(`✅ Сессия отозвана: ${sessionId}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка отзыва сессии:', error);
      return false;
    }
  }

  /**
   * Получает активные сессии пользователя
   */
  static async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('_pidr_user_sessions')
        .select('id, device_info, ip_address, user_agent, last_activity, expires_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('❌ Ошибка получения сессий:', error);
        return [];
      }

      return (sessions || []).map(s => ({
        sessionId: s.id.toString(),
        userId,
        deviceInfo: s.device_info,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        expiresAt: new Date(s.expires_at)
      }));

    } catch (error) {
      console.error('❌ Ошибка получения активных сессий:', error);
      return [];
    }
  }

  /**
   * Логирует действие авторизации
   */
  static async logAuthAction(logEntry: AuthLogEntry): Promise<void> {
    try {
      await supabase
        .from('_pidr_auth_logs')
        .insert({
          user_id: logEntry.userId,
          action: logEntry.action,
          auth_type: logEntry.authType,
          ip_address: logEntry.ipAddress || null,
          user_agent: logEntry.userAgent || null,
          success: logEntry.success,
          error_message: logEntry.errorMessage || null,
          session_id: logEntry.sessionId ? parseInt(logEntry.sessionId) : null
        });

      console.log(`📝 Залогировано действие: ${logEntry.action} для пользователя ${logEntry.userId}`);

    } catch (error) {
      console.error('❌ Ошибка логирования:', error);
    }
  }

  /**
   * Очищает истекшие сессии
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_sessions');

      if (error) {
        console.error('❌ Ошибка очистки сессий:', error);
        return 0;
      }

      console.log(`🧹 Очищено истекших сессий: ${data || 0}`);
      return data || 0;

    } catch (error) {
      console.error('❌ Ошибка очистки истекших сессий:', error);
      return 0;
    }
  }
}
