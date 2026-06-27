'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Страницы, где «назад» закрывает mini app (главное меню) */
const ROOT_PATHS = new Set(['/', '/welcome']);

function isRootPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return ROOT_PATHS.has(pathname);
}

/**
 * Telegram Mini App: BackButton на внутренних экранах + перехват системного «назад».
 * Пока кнопка видна, Telegram не сворачивает приложение, а вызывает onClick.
 */
export default function TelegramBackNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const navigatingRef = useRef(false);

  const navigateBack = useCallback(() => {
    if (typeof window === 'undefined' || navigatingRef.current) return;
    if (isRootPath(pathnameRef.current)) return;

    navigatingRef.current = true;
    const before = pathnameRef.current;

    if (window.history.length > 1) {
      router.back();
      window.setTimeout(() => {
        if (pathnameRef.current === before && !isRootPath(before)) {
          router.push('/');
        }
        navigatingRef.current = false;
      }, 180);
      return;
    }

    router.push('/');
    window.setTimeout(() => {
      navigatingRef.current = false;
    }, 180);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const bindBackButton = () => {
      if (cancelled) return;

      const backButton = window.Telegram?.WebApp?.BackButton;
      if (!backButton) {
        window.setTimeout(bindBackButton, 120);
        return;
      }

      const onRoot = isRootPath(pathname);

      backButton.offClick(navigateBack);

      if (onRoot) {
        backButton.hide();
      } else {
        backButton.onClick(navigateBack);
        backButton.show();
      }

      cleanup = () => {
        backButton.offClick(navigateBack);
      };
    };

    bindBackButton();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [pathname, navigateBack]);

  return null;
}
