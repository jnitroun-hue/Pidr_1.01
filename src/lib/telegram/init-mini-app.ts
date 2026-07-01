import type { TelegramWebApp } from '@/types/telegram-webapp';

const MOBILE_PLATFORMS = new Set(['android', 'ios', 'android_x']);

let initialized = false;

export function isTelegramMiniAppClient(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp;
  return Boolean(tg?.initData && tg.initData.length > 0);
}

export function isTelegramDesktopClient(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = window.Telegram?.WebApp?.platform?.toLowerCase() ?? '';
  if (platform) {
    return !MOBILE_PLATFORMS.has(platform);
  }
  return window.innerWidth >= 768;
}

function applyViewportCss(tg: TelegramWebApp) {
  const stable = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight;
  const height = tg.viewportHeight || stable;
  const root = document.documentElement;

  root.style.setProperty('--tg-viewport-height', `${height}px`);
  root.style.setProperty('--tg-viewport-stable-height', `${stable}px`);
  root.style.setProperty('--app-viewport-height', `${stable}px`);
}

export function initTelegramMiniApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;

  const tg = window.Telegram?.WebApp;
  if (!tg?.initData) return null;

  if (initialized) return tg;
  initialized = true;

  const root = document.documentElement;
  const appBg = '#0f172a';

  tg.ready();

  try {
    tg.expand();
  } catch {
    /* desktop may ignore expand until fullscreen */
  }

  try {
    tg.disableVerticalSwipes?.();
  } catch {
    /* optional API */
  }

  try {
    tg.setHeaderColor?.(appBg);
    tg.setBackgroundColor?.(appBg);
  } catch {
    /* optional API */
  }

  root.classList.add('telegram-mini-app');

  const desktop = isTelegramDesktopClient();
  if (desktop) {
    root.classList.add('telegram-desktop');
    try {
      if (typeof tg.requestFullscreen === 'function' && !tg.isFullscreen) {
        tg.requestFullscreen();
      }
    } catch {
      /* older clients */
    }
  }

  applyViewportCss(tg);

  const onViewportChange = () => {
    applyViewportCss(tg);
    if (desktop) {
      try {
        tg.expand();
      } catch {
        /* ignore */
      }
    }
  };

  if (typeof tg.onEvent === 'function') {
    tg.onEvent('viewportChanged', onViewportChange);
    tg.onEvent('fullscreenChanged', onViewportChange);
  }

  window.addEventListener('resize', onViewportChange);

  return tg;
}
