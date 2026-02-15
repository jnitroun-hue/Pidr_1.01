/**
 * 🔐 УНИВЕРСАЛЬНАЯ СИСТЕМА HEADERS ДЛЯ API ЗАПРОСОВ
 * Поддерживает Telegram, VK и веб-версию
 */

export type AuthEnvironment = 'telegram' | 'vk' | 'web' | 'unknown';

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
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  const environment = detectClientEnvironment();
  
  // Telegram WebApp
  if (environment === 'telegram' && typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    
    if (user?.id) {
      headers['x-telegram-id'] = String(user.id);
      headers['x-auth-source'] = 'telegram';
    }
    
    if (user?.username) {
      headers['x-username'] = user.username;
    }
    
    console.log('🔑 [API Headers] Telegram headers:', {
      telegramId: headers['x-telegram-id'],
      username: headers['x-username']
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
    
    // Пробуем получить из VK Bridge
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
 * Создать fetch запрос с автоматическими headers
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getApiHeaders(),
    ...(options.headers || {})
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Всегда включаем credentials
  });
}

