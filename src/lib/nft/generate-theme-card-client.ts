import { NFT_THEME_CONFIG, pickRandomThemeAsset, type NftThemeKey } from '@/lib/nft/theme-config';
import {
  CARD_FACE,
  drawCardFaceCanvas,
  type CardFaceSpec,
} from '@/lib/nft/card-face-builder';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'] as const;

export type RandomHeroCardSpec = {
  theme: NftThemeKey;
  themeId: number;
  suit: string;
  rank: string;
};

export function pickRandomHeroCardSpec(): RandomHeroCardSpec {
  const { theme, themeId } = pickRandomThemeAsset();
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return { theme, themeId, suit, rank };
}

function normalizeRankForSpec(rank: string): string {
  const r = rank.toLowerCase();
  if (r === 'j' || r === 'jack') return 'jack';
  if (r === 'q' || r === 'queen') return 'queen';
  if (r === 'k' || r === 'king') return 'king';
  if (r === 'a' || r === 'ace') return 'ace';
  return r;
}

/** Ранг для отображения на canvas (J, Q, 10, …) */
export function rankForCanvas(rank: string): string {
  const n = normalizeRankForSpec(rank);
  const map: Record<string, string> = { jack: 'J', queen: 'Q', king: 'K', ace: 'A' };
  if (map[n]) return map[n];
  if (n === '10') return '10';
  return rank.toUpperCase();
}

function toSpec(suit: string, rank: string, theme?: NftThemeKey): CardFaceSpec {
  return {
    suit,
    rankRaw: rank,
    rankNormalized: normalizeRankForSpec(rank),
    themeLabel: theme ? NFT_THEME_CONFIG[theme].name : undefined,
  };
}

const themeImageCache = new Map<string, HTMLImageElement>();

function loadThemeImage(imagePath: string): Promise<HTMLImageElement> {
  const cached = themeImageCache.get(imagePath);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      themeImageCache.set(imagePath, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load ${imagePath}`));
    img.src = imagePath;
  });
}

/** Мгновенная карта без загрузки темы — для первого кадра на главной */
export function generateHeroCardFastDataUrl(suit: string, rank: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_FACE.width;
  canvas.height = CARD_FACE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawCardFaceCanvas(ctx, toSpec(suit, rank));
  return canvas.toDataURL('image/png');
}

/** Клиентская сборка лицевой стороны NFT-карты (белая основа для всех тем) */
export function generateThemeCardImageDataUrl(
  suit: string,
  rank: string,
  theme: NftThemeKey,
  themeId: number
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_FACE.width;
    canvas.height = CARD_FACE.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const themeConfig = NFT_THEME_CONFIG[theme];
    const fileName = `${themeConfig.prefix}${themeId}.png`;
    const imagePath = `/${themeConfig.folder}/${fileName}`;
    const spec = toSpec(suit, rank, theme);

    const finish = (img: HTMLImageElement | null) => {
      try {
        drawCardFaceCanvas(ctx, spec, img);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        drawCardFaceCanvas(ctx, spec);
        resolve(canvas.toDataURL('image/png'));
      }
    };

    loadThemeImage(imagePath)
      .then((img) => finish(img))
      .catch(() => finish(null));
  });
}
