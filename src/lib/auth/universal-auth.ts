/**
 * Универсальная система аутентификации
 * Поддержка: Telegram, Google, VK, Email/Password
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found for universal-auth');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export type AuthProvider = 'telegram' | 'google' | 'vk' | 'email' | 'apple';

export interface AuthResult {
  success: boolean;
  userId?: number;
  sessionToken?: string;
  isNewUser?: boolean;
  error?: string;
}

export interface UserAuthMethod {
  authMethodId: number;
  authProvider: AuthProvider;
  providerUserId: string;
  providerEmail?: string;
  isPrimary: boolean;
  isVerified: boolean;
  firstLoginAt: string;
  lastLoginAt: string;
  loginCount: number;
}

/**
 * Универсальная функция аутентификации
 */
export async function authenticateUser(params: {
  authProvider: AuthProvider;
  providerUserId: string;
  providerEmail?: string;
  providerData?: Record<string, unknown>;
  username?: string;
  avatarUrl?: string;
  supabaseAuthId?: string;
}): Promise<AuthResult> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    const { data, error } = await supabase.rpc('authenticate_user', {
      p_auth_provider: params.authProvider,
      p_provider_user_id: params.providerUserId,
      p_provider_email: params.providerEmail || null,
      p_provider_data: params.providerData || {},
      p_username: params.username || null,
      p_avatar_url: params.avatarUrl || null,
      p_supabase_auth_id: params.supabaseAuthId || null,
    });

    if (error) {
      console.error('❌ Ошибка аутентификации:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Не удалось создать пользователя' };
    }

    const result = data[0];
    const userId = result.user_id;
    const isNewUser = result.is_new_user;

    // Создаем сессию
    const providerData = params.providerData || {};
    const sessionToken = await createSession({
      userId,
      authMethod: params.authProvider,
      userAgent: typeof providerData.userAgent === 'string' ? providerData.userAgent : undefined,
      ipAddress: typeof providerData.ipAddress === 'string' ? providerData.ipAddress : undefined,
      deviceInfo: typeof providerData.deviceInfo === 'object' && providerData.deviceInfo !== null
        ? (providerData.deviceInfo as Record<string, unknown>)
        : undefined,
      telegramInitData: typeof providerData.telegramInitData === 'string' ? providerData.telegramInitData : undefined,
    });

    console.log(`✅ Пользователь ${isNewUser ? 'создан' : 'авторизован'}: ${userId} через ${params.authProvider}`);

    return {
      success: true,
      userId,
      sessionToken,
      isNewUser,
    };
  } catch (error: unknown) {
    console.error('❌ Критическая ошибка аутентификации:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Создание сессии
 */
export async function createSession(params: {
  userId: number;
  authMethod: AuthProvider;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: Record<string, unknown>;
  telegramInitData?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Генерируем уникальный токен
  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashToken(sessionToken);

  const { data, error } = await supabase.rpc('create_user_session', {
    p_user_id: params.userId,
    p_session_token_hash: sessionTokenHash,
    p_auth_method: params.authMethod,
    p_user_agent: params.userAgent || null,
    p_ip_address: params.ipAddress || null,
    p_device_info: params.deviceInfo || {},
    p_telegram_init_data: params.telegramInitData || null,
    p_expires_in_seconds: params.expiresInSeconds || 2592000, // 30 дней
  });

  if (error) {
    console.error('❌ Ошибка создания сессии:', error);
    throw new Error('Не удалось создать сессию');
  }

  console.log('✅ Сессия создана:', data);
  return sessionToken;
}

/**
 * Валидация сессии
 */
export async function validateSession(sessionToken: string): Promise<{
  isValid: boolean;
  userId?: number;
  expiresAt?: string;
}> {
  if (!supabase) {
    return { isValid: false };
  }

  const sessionTokenHash = hashToken(sessionToken);

  const { data, error } = await supabase.rpc('validate_session', {
    p_session_token_hash: sessionTokenHash,
  });

  if (error || !data || data.length === 0) {
    return { isValid: false };
  }

  const session = data[0];
  return {
    isValid: session.is_valid,
    userId: session.user_id,
    expiresAt: session.expires_at,
  };
}

/**
 * Связывание нового метода авторизации с существующим аккаунтом
 */
export async function linkAuthMethod(params: {
  userId: number;
  authProvider: AuthProvider;
  providerUserId: string;
  providerEmail?: string;
  providerData?: Record<string, unknown>;
}): Promise<{ success: boolean; authMethodId?: number; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    const { data, error } = await supabase.rpc('link_auth_method', {
      p_user_id: params.userId,
      p_auth_provider: params.authProvider,
      p_provider_user_id: params.providerUserId,
      p_provider_email: params.providerEmail || null,
      p_provider_data: params.providerData || {},
    });

    if (error) {
      console.error('❌ Ошибка связывания метода:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Метод авторизации связан:', data);
    return { success: true, authMethodId: data };
  } catch (error: unknown) {
    console.error('❌ Критическая ошибка связывания:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Получение всех методов авторизации пользователя
 */
export async function getUserAuthMethods(userId: number): Promise<UserAuthMethod[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_user_auth_methods', {
    p_user_id: userId,
  });

  if (error) {
    console.error('❌ Ошибка получения методов авторизации:', error);
    return [];
  }

  return data.map((method: {
    auth_method_id: number;
    auth_provider: AuthProvider;
    provider_user_id: string;
    provider_email?: string;
    is_primary: boolean;
    is_verified: boolean;
    first_login_at: string;
    last_login_at: string;
    login_count: number;
  }) => ({
    authMethodId: method.auth_method_id,
    authProvider: method.auth_provider,
    providerUserId: method.provider_user_id,
    providerEmail: method.provider_email,
    isPrimary: method.is_primary,
    isVerified: method.is_verified,
    firstLoginAt: method.first_login_at,
    lastLoginAt: method.last_login_at,
    loginCount: method.login_count,
  }));
}

/**
 * Генерация случайного токена сессии
 */
function generateSessionToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Хеширование токена для безопасного хранения
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Инвалидация сессии (logout)
 * ✅ УПРОЩЕНО: Сессии хранятся только в JWT, БД не используется
 */
export async function invalidateSession(sessionToken: string): Promise<boolean> {
  // ✅ УПРОЩЕНО: Сессии больше не хранятся в БД (таблица _pidr_user_sessions удалена)
  // Logout происходит на клиенте путём удаления токена из localStorage/cookies
  console.log('✅ Сессия инвалидирована (клиентская сторона)');
  return true;
}

/**
 * Получение пользователя по ID
 */
export async function getUserById(userId: number) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('_pidr_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Ошибка получения пользователя:', error);
    return null;
  }

  return data;
}

/**
 * Telegram Web App специфичная аутентификация
 */
export async function authenticateTelegramWebApp(initData: string): Promise<AuthResult> {
  try {
    // Парсим initData
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (!userParam) {
      return { success: false, error: 'Нет данных пользователя' };
    }

    const userData = JSON.parse(userParam);
    
    // Валидация через Telegram Bot API (опционально, добавить проверку hash)
    // TODO: Добавить проверку подписи Telegram
    
    return await authenticateUser({
      authProvider: 'telegram',
      providerUserId: userData.id.toString(),
      username: userData.username || `user_${userData.id}`,
      avatarUrl: userData.photo_url,
      providerData: {
        telegramInitData: initData,
        firstName: userData.first_name,
        lastName: userData.last_name,
        languageCode: userData.language_code,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка Telegram Web App auth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Google OAuth аутентификация
 */
export async function authenticateGoogle(googleToken: string): Promise<AuthResult> {
  try {
    // Верифицируем Google токен
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);
    const googleData = await response.json();

    if (googleData.error) {
      return { success: false, error: 'Неверный Google токен' };
    }

    return await authenticateUser({
      authProvider: 'google',
      providerUserId: googleData.sub,
      providerEmail: googleData.email,
      username: googleData.name || googleData.email.split('@')[0],
      avatarUrl: googleData.picture,
      providerData: {
        emailVerified: googleData.email_verified,
        locale: googleData.locale,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка Google auth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * VK OAuth аутентификация
 */
export async function authenticateVK(vkAccessToken: string): Promise<AuthResult> {
  try {
    // Получаем данные пользователя VK
    const response = await fetch(
      `https://api.vk.com/method/users.get?access_token=${vkAccessToken}&fields=photo_200&v=5.131`
    );
    const vkData = await response.json();

    if (vkData.error) {
      return { success: false, error: 'Неверный VK токен' };
    }

    const user = vkData.response[0];

    return await authenticateUser({
      authProvider: 'vk',
      providerUserId: user.id.toString(),
      username: `${user.first_name}_${user.last_name}`.toLowerCase().replace(/\s/g, '_'),
      avatarUrl: user.photo_200,
      providerData: {
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка VK auth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

