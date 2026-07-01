import {
  APP_BUILD_STORAGE_KEY,
  APP_UPDATE_RELOAD_KEY,
  getEmbeddedBuildId,
} from '@/lib/app-version/constants';

export type AppVersionInfo = {
  buildId: string;
  deployedAt?: string | null;
};

export async function fetchServerAppVersion(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(`/api/app/version?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AppVersionInfo;
    if (!data?.buildId) return null;
    return data;
  } catch {
    return null;
  }
}

async function clearBrowserCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    /* ignore */
  }
}

function stripCacheBusterFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('_cb')) return;
  url.searchParams.delete('_cb');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next || '/');
}

/** Сохраняем актуальный build id после успешной загрузки */
export function commitAppBuildId(buildId: string): void {
  try {
    localStorage.setItem(APP_BUILD_STORAGE_KEY, buildId);
    sessionStorage.removeItem(APP_UPDATE_RELOAD_KEY);
    stripCacheBusterFromUrl();
  } catch {
    /* ignore */
  }
}

/**
 * true = нужна перезагрузка (вызывающий код делает location.replace).
 * false = версия актуальна.
 */
export async function shouldReloadForAppUpdate(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const server = await fetchServerAppVersion();
  if (!server) {
    commitAppBuildId(getEmbeddedBuildId());
    return false;
  }

  const serverBuildId = server.buildId;
  let storedBuildId: string | null = null;
  try {
    storedBuildId = localStorage.getItem(APP_BUILD_STORAGE_KEY);
  } catch {
    storedBuildId = null;
  }

  const embeddedBuildId = getEmbeddedBuildId();

  // Первая сессия — запоминаем и продолжаем
  if (!storedBuildId) {
    commitAppBuildId(serverBuildId);
    return false;
  }

  // Уже на актуальной версии
  if (storedBuildId === serverBuildId && embeddedBuildId === serverBuildId) {
    commitAppBuildId(serverBuildId);
    return false;
  }

  // Защита от бесконечного reload
  try {
    if (sessionStorage.getItem(APP_UPDATE_RELOAD_KEY) === serverBuildId) {
      commitAppBuildId(serverBuildId);
      return false;
    }
    sessionStorage.setItem(APP_UPDATE_RELOAD_KEY, serverBuildId);
  } catch {
    /* ignore */
  }

  return true;
}

export async function reloadAppToLatestVersion(): Promise<void> {
  await clearBrowserCaches();

  const url = new URL(window.location.href);
  url.searchParams.set('_cb', Date.now().toString());
  window.location.replace(url.toString());
}

/** Полная проверка: при необходимости перезагружает страницу */
export async function ensureLatestAppVersion(): Promise<'ok' | 'reloading'> {
  const needsReload = await shouldReloadForAppUpdate();
  if (needsReload) {
    await reloadAppToLatestVersion();
    return 'reloading';
  }
  return 'ok';
}
