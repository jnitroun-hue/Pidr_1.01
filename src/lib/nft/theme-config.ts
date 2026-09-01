/** Конфиг тем NFT-генератора (общий для клиента и сервера) */

export const NFT_THEME_CONFIG = {
  pokemon: {
    name: 'Покемон',
    total: 52,
    folder: 'pokemon',
    prefix: '',
  },
  halloween: {
    name: 'Хеллоуин',
    total: 10,
    folder: 'halloween',
    prefix: 'hel_',
  },
  starwars: {
    name: 'Звездные войны',
    total: 7,
    folder: 'starwars',
    prefix: 'star_',
  },
  legendary: {
    name: 'Легендарная',
    total: 5,
    folder: 'legendary',
    prefix: 'leg_',
  },
  unique: {
    name: 'Уникальные',
    total: 12,
    folder: 'unique',
    prefix: 'uniq_',
    animated: true,
  },
} as const;

export type NftThemeKey = keyof typeof NFT_THEME_CONFIG;

export function isNftThemeKey(value: unknown): value is NftThemeKey {
  return typeof value === 'string' && value in NFT_THEME_CONFIG;
}

export function isAnimatedNftTheme(theme: NftThemeKey): boolean {
  return Boolean((NFT_THEME_CONFIG[theme] as { animated?: boolean }).animated);
}

/** Достаёт тему из имени файла storage: pokemon_10_hearts_3_….png */
export function parseNftThemeFromImageUrl(url?: string | null): { theme: NftThemeKey; themeId: number } | null {
  if (!url) return null;
  const file = decodeURIComponent(String(url).split('?')[0].split('/').pop() || '');
  const match = file.match(/^(pokemon|halloween|starwars|legendary|unique)_([^_]+)_([^_]+)_(\d+)/i);
  if (!match) return null;
  const theme = match[1].toLowerCase();
  const themeId = Number(match[4]);
  if (!isNftThemeKey(theme) || !Number.isFinite(themeId) || themeId < 1) return null;
  return { theme, themeId };
}

export interface ThemeAssetPick {
  theme: NftThemeKey;
  themeId: number;
}

const themeAssetPool: ThemeAssetPick[] = (() => {
  const pool: ThemeAssetPick[] = [];
  for (const theme of Object.keys(NFT_THEME_CONFIG) as NftThemeKey[]) {
    const cfg = NFT_THEME_CONFIG[theme];
    for (let id = 1; id <= cfg.total; id += 1) {
      pool.push({ theme, themeId: id });
    }
  }
  return pool;
})();

/** Карта из общего пула по детерминированному seed (акция дня и т.п.) */
export function pickSeededThemeAsset(seed: number): ThemeAssetPick {
  const idx = Math.abs(seed) % themeAssetPool.length;
  return themeAssetPool[idx];
}

/** Случайная картинка из ВСЕХ тем */
export function pickRandomThemeAsset(): ThemeAssetPick {
  return themeAssetPool[Math.floor(Math.random() * themeAssetPool.length)];
}

export const THEME_ASSET_EXTS = ['gif', 'webp', 'png'] as const;

export function themeAssetFileName(pick: ThemeAssetPick, ext: string = 'png'): string {
  const cfg = NFT_THEME_CONFIG[pick.theme];
  return `${cfg.prefix}${pick.themeId}.${ext}`;
}

export function getThemeAssetRelativePath(pick: ThemeAssetPick, ext: string = 'png'): string {
  const cfg = NFT_THEME_CONFIG[pick.theme];
  return `${cfg.folder}/${themeAssetFileName(pick, ext)}`;
}

export function getThemeAssetPublicPath(pick: ThemeAssetPick): string {
  return `/${getThemeAssetRelativePath(pick)}`;
}
