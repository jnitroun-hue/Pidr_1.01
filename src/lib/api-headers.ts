/**
 * 🔐 УНИВЕРСАЛЬНАЯ СИСТЕМА HEADERS ДЛЯ API ЗАПРОСОВ
 * Поддерживает Telegram, VK и веб-версию
 */

export type AuthEnvironment = 'telegram' | 'vk' | 'web' | 'unknown';

/** fetch/Headers требуют ISO-8859-1 — кодируем UTF-8 в percent-encoding */
export function isAsciiHeaderValue(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0xff) return false;
  }
  return true;
}

export function sanitizeHttpHeaderValue(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return isAsciiHeaderValue(trimmed) ? trimmed : encodeURIComponent(trimmed);
}

/** На сервере: раскодировать имя из x-telegram-first-name / x-username */
export function decodeHttpHeaderValue(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Безопасный x-username из Telegram user (username или first_name) */
export function telegramUsernameHeader(
  user?: { username?: string; first_name?: string } | null
): Record<string, string> {
  const raw = user?.username || user?.first_name;
  if (!raw) return {};
  return { 'x-username': sanitizeHttpHeaderValue(raw) };
}

function setSafeHeader(headers: Record<string, string>, key: string, value: string | undefined | null) {
  if (!value) return;
  headers[key] = sanitizeHttpHeaderValue(value);
}

/**
 * Определение окружения на клиенте
 */
export function detectClientEnvironment(): AuthEnvironment {
  if (typeof window === 'undefined') return 'unknown';
  
  // Проверяем Telegram
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return 'telegram';
  }
  
  // Проверяем VK
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('vk_user_id') && urlParams.has('sign')) {
    return 'vk';
  }
  
  // Проверяем VK Bridge
  if ((window as any).VK?.Bridge) {
    return 'vk';
  }
  
  return 'web';
}

/**
 * Получить headers для API запроса (универсально для всех платформ)
 */
export function getApiHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const environment = detectClientEnvironment();
  
  // Telegram WebApp
  if (environment === 'telegram' && typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    
    if (user?.id) {
      headers['x-telegram-id'] = String(user.id);
      headers['x-auth-source'] = 'telegram';
    }

    setSafeHeader(headers, 'x-telegram-photo', user?.photo_url);
    setSafeHeader(headers, 'x-telegram-first-name', user?.first_name);
    setSafeHeader(headers, 'x-username', user?.username);
    
    console.log('🔑 [API Headers] Telegram headers:', {
      telegramId: headers['x-telegram-id'],
      username: headers['x-username'] ? decodeHttpHeaderValue(headers['x-username']) : undefined,
    });
  }
  // VK Mini App
  else if (environment === 'vk') {
    const urlParams = new URLSearchParams(window.location.search);
    const vkUserId = urlParams.get('vk_user_id');
    
    if (vkUserId) {
      headers['x-vk-id'] = vkUserId;
      headers['x-auth-source'] = 'vk';
    }
    if (!vkUserId && typeof window !== 'undefined' && (window as any).VK?.Bridge) {
      try {
        const vkBridge = (window as any).VK.Bridge;
        vkBridge.send('VKWebAppGetUserInfo', {}, (data: any) => {
          if (data?.id) {
            headers['x-vk-id'] = String(data.id);
            headers['x-auth-source'] = 'vk';
          }
        });
      } catch (e) {
        console.warn('⚠️ [API Headers] Не удалось получить VK user info');
      }
    }
    
    console.log('🔑 [API Headers] VK headers:', {
      vkId: headers['x-vk-id']
    });
  }
  // Web версия - используем токен из cookies
  else {
    headers['x-auth-source'] = 'web';
    console.log('🔑 [API Headers] Web headers (токен из cookies)');
  }

  return headers;
}

/**
 * Базовые клиентские auth-заголовки + переопределения (работает и с Record, и с Headers).
 */
export function mergeApiHeaders(extra?: HeadersInit): Headers {
  const merged = new Headers(getApiHeaders() as HeadersInit);
  if (!extra) return merged;
  const over = new Headers(extra);
  over.forEach((value, key) => merged.set(key, sanitizeHttpHeaderValue(value)));
  return merged;
}

/**
 * Создать fetch запрос с автоматическими headers
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const { headers: optHeaders, ...rest } = options;
  return fetch(url, {
    ...rest,
    headers: mergeApiHeaders(optHeaders),
    credentials: 'include',
  });
}

