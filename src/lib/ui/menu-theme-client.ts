import type { CSSProperties } from 'react';
import {
  DEFAULT_MENU_THEME,
  isStoredMenuTheme,
  parseCustomMenuTheme,
  resolveMenuTheme,
} from '@/lib/ui/menuThemes';

export const MENU_THEME_STORAGE_KEY = 'pidr_menu_theme';

export function readStoredMenuTheme(): string {
  if (typeof window === 'undefined') return DEFAULT_MENU_THEME;
  try {
    const raw = localStorage.getItem(MENU_THEME_STORAGE_KEY);
    return isStoredMenuTheme(raw) ? raw : DEFAULT_MENU_THEME;
  } catch {
    return DEFAULT_MENU_THEME;
  }
}

export function storeMenuTheme(themeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MENU_THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

export function menuThemeStyleVars(themeId: string | null | undefined): CSSProperties {
  const theme = resolveMenuTheme(themeId);
  return {
    ...theme.vars,
    '--menu-button-bg': theme.vars['--menu-button-bg'] || theme.vars['--menu-card-bg'],
    '--menu-button-border': theme.vars['--menu-button-border'] || theme.vars['--menu-card-border'],
    '--menu-button-text': theme.vars['--menu-button-text'] || theme.vars['--menu-text'],
  } as CSSProperties;
}

/** CSS-переменные темы на documentElement — действуют на всех страницах, включая бургер-меню. */
export function applyMenuThemeToDocument(themeId: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  const theme = resolveMenuTheme(themeId);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    if (value) root.style.setProperty(key, value);
  }
  root.style.setProperty('--menu-button-bg', theme.vars['--menu-button-bg'] || theme.vars['--menu-card-bg']);
  root.style.setProperty('--menu-button-border', theme.vars['--menu-button-border'] || theme.vars['--menu-card-border']);
  root.style.setProperty('--menu-button-text', theme.vars['--menu-button-text'] || theme.vars['--menu-text']);
  root.dataset.menuTheme = theme.id;
  const custom = parseCustomMenuTheme(theme.id);
  if (custom) {
    root.dataset.menuButtonFinish = custom.buttonFinish || 'gradient';
    root.dataset.menuOutlineMotion = custom.outlineMotion || 'still';
  } else {
    delete root.dataset.menuButtonFinish;
    delete root.dataset.menuOutlineMotion;
  }
  root.style.setProperty('--background-color', theme.vars['--menu-bg']);
  root.style.setProperty('--game-bg', theme.vars['--menu-bg']);
  root.style.setProperty('--accent-color', theme.vars['--menu-accent']);
  storeMenuTheme(theme.id);
}

const CHROME_PAD_TOP = 'calc(var(--app-chrome-top, 12px) + 56px)';
const CHROME_PAD_INLINE = 'max(12px, env(safe-area-inset-left, 0px))';
const CHROME_PAD_INLINE_RIGHT = 'max(12px, env(safe-area-inset-right, 0px))';
const CHROME_PAD_BOTTOM = 'max(20px, env(safe-area-inset-bottom, 0px))';

export function themedPageShellStyle(extra?: CSSProperties): CSSProperties {
  const {
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    ...rest
  } = extra ?? {};
  const shorthand = typeof padding === 'string' || typeof padding === 'number' ? padding : undefined;

  return {
    minHeight: '100dvh',
    background: 'var(--menu-bg-accent), var(--menu-bg)',
    color: 'var(--menu-text)',
    transition: 'background 0.35s ease, color 0.25s ease',
    overflowX: 'hidden',
    WebkitTextSizeAdjust: '100%',
    // shorthand `padding` must not wipe Telegram chrome offset
    paddingTop: paddingTop ?? CHROME_PAD_TOP,
    paddingLeft: paddingLeft ?? shorthand ?? CHROME_PAD_INLINE,
    paddingRight: paddingRight ?? shorthand ?? CHROME_PAD_INLINE_RIGHT,
    paddingBottom: paddingBottom ?? shorthand ?? CHROME_PAD_BOTTOM,
    ...rest,
  };
}

export function themedFixedBackStyle(extra?: CSSProperties): CSSProperties {
  return {
    position: 'fixed',
    top: 'calc(var(--app-chrome-top, 12px) + 4px)',
    left: 'max(12px, env(safe-area-inset-left, 0px))',
    zIndex: 100,
    ...extra,
  };
}
