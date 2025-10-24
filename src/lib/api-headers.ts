/**
 * 🔐 ЕДИНАЯ СИСТЕМА HEADERS ДЛЯ API ЗАПРОСОВ
 * Автоматически добавляет x-telegram-id и x-username headers
 */

/**
 * Получить headers для API запроса из Telegram WebApp
 */
export function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  // Получаем данные из Telegram WebApp
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    
    if (user?.id) {
      headers['x-telegram-id'] = String(user.id);
    }
    
    if (user?.username) {
      headers['x-username'] = user.username;
    }
    
    console.log('🔑 [API Headers] Добавлены headers:', {
      telegramId: headers['x-telegram-id'],
      username: headers['x-username']
    });
  } else {
    console.warn('⚠️ [API Headers] Telegram WebApp недоступен');
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

