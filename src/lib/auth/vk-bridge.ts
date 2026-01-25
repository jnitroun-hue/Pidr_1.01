/**
 * VK Bridge для авторизации через VK Mini App
 * Документация: https://dev.vk.com/bridge/overview
 */

declare global {
  interface Window {
    vkBridge?: any;
  }
}

export interface VKBridgeAuthData {
  vk_user_id: number;
  vk_access_token_settings?: string;
  vk_app_id: number;
  vk_are_notifications_enabled?: number;
  vk_is_app_user?: number;
  vk_is_favorite?: number;
  vk_language: string;
  vk_platform: string;
  vk_ref?: string;
  vk_ts: number;
  sign: string;
}

export interface VKUserInfo {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
  photo_200?: string;
}

/**
 * Инициализация VK Bridge
 */
export async function initVKBridge(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Проверяем, загружен ли VK Bridge
    if (!window.vkBridge) {
      console.log('📦 Загружаем VK Bridge...');
      
      // Динамически загружаем VK Bridge
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      if (!window.vkBridge) {
        throw new Error('VK Bridge не загружен');
      }
    }

    // Инициализируем VK Bridge
    await window.vkBridge.send('VKWebAppInit');
    console.log('✅ VK Bridge инициализирован');
    return true;
  } catch (error) {
    console.error('❌ Ошибка инициализации VK Bridge:', error);
    return false;
  }
}

/**
 * Получить данные запуска VK Mini App
 */
export function getVKLaunchParams(): VKBridgeAuthData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Получаем параметры из URL
    const searchParams = new URLSearchParams(window.location.search);
    
    const vk_user_id = searchParams.get('vk_user_id');
    const sign = searchParams.get('sign');

    if (!vk_user_id || !sign) {
      console.log('⚠️ VK параметры не найдены в URL');
      return null;
    }

    const launchParams: VKBridgeAuthData = {
      vk_user_id: parseInt(vk_user_id),
      vk_access_token_settings: searchParams.get('vk_access_token_settings') || undefined,
      vk_app_id: parseInt(searchParams.get('vk_app_id') || '0'),
      vk_are_notifications_enabled: parseInt(searchParams.get('vk_are_notifications_enabled') || '0'),
      vk_is_app_user: parseInt(searchParams.get('vk_is_app_user') || '0'),
      vk_is_favorite: parseInt(searchParams.get('vk_is_favorite') || '0'),
      vk_language: searchParams.get('vk_language') || 'ru',
      vk_platform: searchParams.get('vk_platform') || 'desktop_web',
      vk_ref: searchParams.get('vk_ref') || undefined,
      vk_ts: parseInt(searchParams.get('vk_ts') || '0'),
      sign
    };

    console.log('✅ VK launch params получены:', { vk_user_id: launchParams.vk_user_id });
    return launchParams;
  } catch (error) {
    console.error('❌ Ошибка получения VK launch params:', error);
    return null;
  }
}

/**
 * Получить информацию о пользователе VK
 */
export async function getVKUserInfo(): Promise<VKUserInfo | null> {
  if (typeof window === 'undefined' || !window.vkBridge) {
    return null;
  }

  try {
    const userInfo = await window.vkBridge.send('VKWebAppGetUserInfo');
    console.log('✅ VK user info получен:', userInfo);
    return userInfo;
  } catch (error) {
    console.error('❌ Ошибка получения VK user info:', error);
    return null;
  }
}

/**
 * Проверить, запущено ли приложение в VK Mini App
 */
export function isVKMiniApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Проверяем наличие VK параметров в URL
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.has('vk_user_id') && searchParams.has('sign');
}

/**
 * Авторизация через VK Mini App
 */
export async function loginWithVKMiniApp(): Promise<{
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}> {
  try {
    // Инициализируем VK Bridge
    const initialized = await initVKBridge();
    if (!initialized) {
      return {
        success: false,
        message: 'Не удалось инициализировать VK Bridge'
      };
    }

    // Получаем launch params
    const launchParams = getVKLaunchParams();
    if (!launchParams) {
      return {
        success: false,
        message: 'Откройте приложение через VK'
      };
    }

    // Получаем информацию о пользователе
    const userInfo = await getVKUserInfo();
    if (!userInfo) {
      return {
        success: false,
        message: 'Не удалось получить информацию о пользователе'
      };
    }

    // Отправляем данные на сервер для авторизации
    const response = await fetch('/api/auth/vk-miniapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...launchParams,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        photo_url: userInfo.photo_200 || userInfo.photo_100
      })
    });

    const data = await response.json();

    if (data.success) {
      // Сохраняем токен и данные пользователя
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('current_user', JSON.stringify(data.user));

      return {
        success: true,
        user: data.user,
        token: data.token
      };
    } else {
      return {
        success: false,
        message: data.message || 'Ошибка авторизации'
      };
    }
  } catch (error) {
    console.error('❌ Ошибка VK авторизации:', error);
    return {
      success: false,
      message: 'Ошибка сети. Попробуйте позже.'
    };
  }
}

