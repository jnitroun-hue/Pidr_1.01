export type MenuThemeId =
  | 'slate'
  | 'midnight'
  | 'forest'
  | 'gold'
  | 'aurora'
  | 'cyber'
  | 'ember'
  | 'ocean';

export interface MenuThemeTokens {
  id: MenuThemeId;
  labelRu: string;
  labelEn: string;
  premium: boolean;
  /** CSS custom properties applied to the main menu root */
  vars: {
    '--menu-bg': string;
    '--menu-bg-accent': string;
    '--menu-card-bg': string;
    '--menu-card-border': string;
    '--menu-text': string;
    '--menu-text-muted': string;
    '--menu-accent': string;
    '--menu-accent-soft': string;
    '--menu-shadow': string;
    '--menu-wallet-border': string;
  };
}

export const DEFAULT_MENU_THEME: MenuThemeId = 'slate';

export const MENU_THEMES: Record<MenuThemeId, MenuThemeTokens> = {
  slate: {
    id: 'slate',
    labelRu: 'Сланец',
    labelEn: 'Slate',
    premium: false,
    vars: {
      '--menu-bg': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 80% 10%, rgba(99,102,241,0.18), transparent 42%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
      '--menu-card-border': 'rgba(99, 102, 241, 0.35)',
      '--menu-text': '#f1f5f9',
      '--menu-text-muted': '#94a3b8',
      '--menu-accent': '#6366f1',
      '--menu-accent-soft': 'rgba(99, 102, 241, 0.22)',
      '--menu-shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
      '--menu-wallet-border': 'rgba(99, 102, 241, 0.35)',
    },
  },
  midnight: {
    id: 'midnight',
    labelRu: 'Полночь',
    labelEn: 'Midnight',
    premium: false,
    vars: {
      '--menu-bg': 'linear-gradient(160deg, #020617 0%, #0b1224 45%, #111827 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 20% 0%, rgba(56,189,248,0.16), transparent 40%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.96) 100%)',
      '--menu-card-border': 'rgba(56, 189, 248, 0.35)',
      '--menu-text': '#e2e8f0',
      '--menu-text-muted': '#7dd3fc',
      '--menu-accent': '#38bdf8',
      '--menu-accent-soft': 'rgba(56, 189, 248, 0.2)',
      '--menu-shadow': '0 8px 24px rgba(2, 6, 23, 0.55)',
      '--menu-wallet-border': 'rgba(56, 189, 248, 0.4)',
    },
  },
  forest: {
    id: 'forest',
    labelRu: 'Лес',
    labelEn: 'Forest',
    premium: false,
    vars: {
      '--menu-bg': 'linear-gradient(145deg, #052e16 0%, #14532d 48%, #166534 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 70% 20%, rgba(74,222,128,0.2), transparent 45%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(20, 83, 45, 0.94) 0%, rgba(6, 46, 22, 0.96) 100%)',
      '--menu-card-border': 'rgba(74, 222, 128, 0.4)',
      '--menu-text': '#ecfdf5',
      '--menu-text-muted': '#86efac',
      '--menu-accent': '#4ade80',
      '--menu-accent-soft': 'rgba(74, 222, 128, 0.22)',
      '--menu-shadow': '0 8px 22px rgba(6, 46, 22, 0.45)',
      '--menu-wallet-border': 'rgba(74, 222, 128, 0.4)',
    },
  },
  gold: {
    id: 'gold',
    labelRu: 'Премиум золото',
    labelEn: 'Premium Gold',
    premium: true,
    vars: {
      '--menu-bg': 'linear-gradient(150deg, #1c1408 0%, #3b2a0c 45%, #1a1208 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 50% 0%, rgba(245,197,24,0.28), transparent 48%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(61, 42, 14, 0.95) 0%, rgba(24, 16, 6, 0.96) 100%)',
      '--menu-card-border': 'rgba(245, 197, 24, 0.55)',
      '--menu-text': '#fff7ed',
      '--menu-text-muted': '#fde68a',
      '--menu-accent': '#f5c518',
      '--menu-accent-soft': 'rgba(245, 197, 24, 0.22)',
      '--menu-shadow': '0 10px 28px rgba(245, 197, 24, 0.12)',
      '--menu-wallet-border': 'rgba(245, 197, 24, 0.5)',
    },
  },
  aurora: {
    id: 'aurora',
    labelRu: 'Аврора',
    labelEn: 'Aurora',
    premium: true,
    vars: {
      '--menu-bg': 'linear-gradient(135deg, #0f172a 0%, #312e81 40%, #831843 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 30% 10%, rgba(244,114,182,0.28), transparent 42%), radial-gradient(circle at 90% 30%, rgba(56,189,248,0.22), transparent 40%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(49, 46, 129, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
      '--menu-card-border': 'rgba(244, 114, 182, 0.45)',
      '--menu-text': '#fdf2f8',
      '--menu-text-muted': '#f9a8d4',
      '--menu-accent': '#f472b6',
      '--menu-accent-soft': 'rgba(244, 114, 182, 0.22)',
      '--menu-shadow': '0 10px 30px rgba(244, 114, 182, 0.15)',
      '--menu-wallet-border': 'rgba(167, 139, 250, 0.5)',
    },
  },
  cyber: {
    id: 'cyber',
    labelRu: 'Кибер',
    labelEn: 'Cyber',
    premium: true,
    vars: {
      '--menu-bg': 'linear-gradient(145deg, #020617 0%, #0f172a 40%, #083344 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 85% 15%, rgba(34,211,238,0.3), transparent 40%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(8, 51, 68, 0.92) 0%, rgba(2, 6, 23, 0.96) 100%)',
      '--menu-card-border': 'rgba(34, 211, 238, 0.5)',
      '--menu-text': '#ecfeff',
      '--menu-text-muted': '#67e8f9',
      '--menu-accent': '#22d3ee',
      '--menu-accent-soft': 'rgba(34, 211, 238, 0.22)',
      '--menu-shadow': '0 0 24px rgba(34, 211, 238, 0.12)',
      '--menu-wallet-border': 'rgba(34, 211, 238, 0.45)',
    },
  },
  ember: {
    id: 'ember',
    labelRu: 'Угли',
    labelEn: 'Ember',
    premium: true,
    vars: {
      '--menu-bg': 'linear-gradient(150deg, #1c0a0a 0%, #7f1d1d 45%, #431407 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 40% 0%, rgba(251,146,60,0.28), transparent 45%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(127, 29, 29, 0.9) 0%, rgba(28, 10, 10, 0.96) 100%)',
      '--menu-card-border': 'rgba(251, 146, 60, 0.5)',
      '--menu-text': '#fff7ed',
      '--menu-text-muted': '#fdba74',
      '--menu-accent': '#fb923c',
      '--menu-accent-soft': 'rgba(251, 146, 60, 0.22)',
      '--menu-shadow': '0 10px 28px rgba(239, 68, 68, 0.18)',
      '--menu-wallet-border': 'rgba(251, 146, 60, 0.45)',
    },
  },
  ocean: {
    id: 'ocean',
    labelRu: 'Океан',
    labelEn: 'Ocean',
    premium: true,
    vars: {
      '--menu-bg': 'linear-gradient(160deg, #042f2e 0%, #0e7490 48%, #164e63 100%)',
      '--menu-bg-accent': 'radial-gradient(circle at 15% 20%, rgba(45,212,191,0.28), transparent 42%)',
      '--menu-card-bg': 'linear-gradient(145deg, rgba(14, 116, 144, 0.9) 0%, rgba(4, 47, 46, 0.96) 100%)',
      '--menu-card-border': 'rgba(45, 212, 191, 0.5)',
      '--menu-text': '#f0fdfa',
      '--menu-text-muted': '#5eead4',
      '--menu-accent': '#2dd4bf',
      '--menu-accent-soft': 'rgba(45, 212, 191, 0.22)',
      '--menu-shadow': '0 10px 28px rgba(13, 148, 136, 0.22)',
      '--menu-wallet-border': 'rgba(45, 212, 191, 0.45)',
    },
  },
};

export const MENU_THEME_IDS = Object.keys(MENU_THEMES) as MenuThemeId[];

export function isMenuThemeId(value: unknown): value is MenuThemeId {
  return typeof value === 'string' && value in MENU_THEMES;
}

export function resolveMenuTheme(id: string | null | undefined): MenuThemeTokens {
  if (isMenuThemeId(id)) return MENU_THEMES[id];
  return MENU_THEMES[DEFAULT_MENU_THEME];
}

export function listMenuThemes(options?: { includePremium?: boolean }) {
  const includePremium = options?.includePremium !== false;
  return MENU_THEME_IDS
    .map((id) => MENU_THEMES[id])
    .filter((theme) => includePremium || !theme.premium);
}

/** Случайная тема: для Premium — из всех, иначе только бесплатные. */
export function pickRandomMenuTheme(isPremium: boolean): MenuThemeId {
  const pool = listMenuThemes({ includePremium: isPremium });
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]?.id ?? DEFAULT_MENU_THEME;
}

export function canUseMenuTheme(themeId: MenuThemeId, isPremium: boolean): boolean {
  const theme = MENU_THEMES[themeId];
  if (!theme) return false;
  if (!theme.premium) return true;
  return isPremium;
}
