import type { CSSProperties } from 'react';
import {
  DEFAULT_MENU_THEME,
  isMenuThemeId,
  resolveMenuTheme,
  type MenuThemeId,
} from '@/lib/ui/menuThemes';

export const MENU_THEME_STORAGE_KEY = 'pidr_menu_theme';

export function readStoredMenuTheme(): MenuThemeId {
  if (typeof window === 'undefined') return DEFAULT_MENU_THEME;
  try {
    const raw = localStorage.getItem(MENU_THEME_STORAGE_KEY);
    return isMenuThemeId(raw) ? raw : DEFAULT_MENU_THEME;
  } catch {
    return DEFAULT_MENU_THEME;
  }
}

export function storeMenuTheme(themeId: MenuThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MENU_THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

export function menuThemeStyleVars(themeId: MenuThemeId | string | null | undefined): CSSProperties {
  const theme = resolveMenuTheme(themeId);
  return theme.vars as unknown as CSSProperties;
}
