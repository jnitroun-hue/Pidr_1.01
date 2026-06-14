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
} as const;

export type NftThemeKey = keyof typeof NFT_THEME_CONFIG;

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

/** Случайная картинка из ВСЕХ тем (74 ассета) */
export function pickRandomThemeAsset(): ThemeAssetPick {
  return themeAssetPool[Math.floor(Math.random() * themeAssetPool.length)];
}

export function getThemeAssetRelativePath(pick: ThemeAssetPick): string {
  const cfg = NFT_THEME_CONFIG[pick.theme];
  return `${cfg.folder}/${cfg.prefix}${pick.themeId}.png`;
}

export function getThemeAssetPublicPath(pick: ThemeAssetPick): string {
  return `/${getThemeAssetRelativePath(pick)}`;
}
