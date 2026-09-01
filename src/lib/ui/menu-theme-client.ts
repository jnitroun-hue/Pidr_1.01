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

/** CSS-переменные темы на documentElement — действуют на всех страницах, включая бургер-меню. */
export function applyMenuThemeToDocument(themeId: MenuThemeId | string | null | undefined): void {
  if (typeof document === 'undefined') return;
  const theme = resolveMenuTheme(themeId);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.menuTheme = theme.id;
  root.style.setProperty('--background-color', theme.vars['--menu-bg']);
  root.style.setProperty('--game-bg', theme.vars['--menu-bg']);
  root.style.setProperty('--accent-color', theme.vars['--menu-accent']);
  storeMenuTheme(theme.id);
}

export function themedPageShellStyle(extra?: CSSProperties): CSSProperties {
  return {
    minHeight: '100vh',
    background: 'var(--menu-bg-accent), var(--menu-bg)',
    color: 'var(--menu-text)',
    transition: 'background 0.35s ease, color 0.25s ease',
    ...extra,
  };
}
