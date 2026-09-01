'use client';

import { useEffect } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import {
  applyMenuThemeToDocument,
  readStoredMenuTheme,
} from '@/lib/ui/menu-theme-client';
import { isMenuThemeId } from '@/lib/ui/menuThemes';

/** Поднимает выбранную тему меню на весь интерфейс (html CSS vars). */
export default function MenuThemeRoot() {
  useEffect(() => {
    applyMenuThemeToDocument(readStoredMenuTheme());

    const onTheme = (event: Event) => {
      const themeId = (event as CustomEvent<{ themeId?: string }>).detail?.themeId;
      if (isMenuThemeId(themeId)) applyMenuThemeToDocument(themeId);
    };
    window.addEventListener('pidr-menu-theme', onTheme as EventListener);

    void fetch('/api/user/menu-theme', {
      credentials: 'include',
      headers: getApiHeaders(),
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && isMenuThemeId(data.themeId)) {
          applyMenuThemeToDocument(data.themeId);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('pidr-menu-theme', onTheme as EventListener);
  }, []);

  return null;
}
