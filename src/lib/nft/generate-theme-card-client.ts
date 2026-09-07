import { NFT_THEME_CONFIG, pickRandomThemeAsset, type NftThemeKey } from '@/lib/nft/theme-config';
import { getThemeAssetCandidateUrls } from '@/lib/nft/theme-asset-urls';
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

function loadThemeImageFromUrl(imagePath: string): Promise<HTMLImageElement> {
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

/**
 * Один арт темы (theme/themeId) используется для всех карт этой темы.
 * Кешируем сам промис: перебор кандидатов (.gif → .webp → .png → storage) с 404-ами
 * выполняется один раз, а не для каждой карты и каждого монтирования.
 */
const themeAssetInflight = new Map<string, Promise<HTMLImageElement>>();

function loadThemeImage(theme: NftThemeKey, themeId: number): Promise<HTMLImageElement> {
  const key = `${theme}/${themeId}`;
  const existing = themeAssetInflight.get(key);
  if (existing) return existing;

  const task = (async () => {
    const candidates = getThemeAssetCandidateUrls(theme, themeId);
    let lastError: Error | null = null;
    for (const url of candidates) {
      try {
        return await loadThemeImageFromUrl(url);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError ?? new Error(`Theme asset not found: ${theme}/${themeId}`);
  })();

  themeAssetInflight.set(key, task);
  // Неудачу не кешируем навсегда — дадим шанс повторить при следующем обращении.
  task.catch(() => themeAssetInflight.delete(key));
  return task;
}

/** LRU-кеш готовых data URL: ключ → картинка. Колода игрока (36 карт) + запас под магазин. */
const COMPOSED_CACHE_LIMIT = 160;
const composedCardCache = new Map<string, string>();
const composedInflight = new Map<string, Promise<string>>();
const fastPreviewCache = new Map<string, string>();

function rememberComposed(key: string, url: string) {
  if (composedCardCache.has(key)) composedCardCache.delete(key);
  composedCardCache.set(key, url);
  if (composedCardCache.size > COMPOSED_CACHE_LIMIT) {
    const oldest = composedCardCache.keys().next().value;
    if (oldest !== undefined) composedCardCache.delete(oldest);
  }
}

export function themeCardCacheKey(suit: string, rank: string, theme: NftThemeKey, themeId: number): string {
  return `${suit}|${normalizeRankForSpec(rank)}|${theme}|${themeId}`;
}

/** Синхронно: готовая картинка, если карта уже собиралась (без «Загрузка…»). */
export function getCachedThemeCardUrl(
  suit: string,
  rank: string,
  theme: NftThemeKey,
  themeId: number
): string | null {
  const key = themeCardCacheKey(suit, rank, theme, themeId);
  const hit = composedCardCache.get(key);
  if (!hit) return null;
  rememberComposed(key, hit); // LRU touch
  return hit;
}

/** Мгновенный безопасный preview; для темы содержит заметный центральный арт-заполнитель. */
export function generateHeroCardFastDataUrl(
  suit: string,
  rank: string,
  theme?: NftThemeKey
): string {
  const key = `${suit}|${normalizeRankForSpec(rank)}|${theme ?? ''}`;
  const cached = fastPreviewCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_FACE.width;
  canvas.height = CARD_FACE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawCardFaceCanvas(ctx, toSpec(suit, rank, theme));
  const url = canvas.toDataURL('image/png');
  if (fastPreviewCache.size > COMPOSED_CACHE_LIMIT) fastPreviewCache.clear();
  fastPreviewCache.set(key, url);
  return url;
}

/** Клиентская сборка лицевой стороны NFT-карты (классическое лицо + арт темы). Результат кешируется. */
export function generateThemeCardImageDataUrl(
  suit: string,
  rank: string,
  theme: NftThemeKey,
  themeId: number
): Promise<string> {
  const key = themeCardCacheKey(suit, rank, theme, themeId);
  const cached = composedCardCache.get(key);
  if (cached) return Promise.resolve(cached);
  const inflight = composedInflight.get(key);
  if (inflight) return inflight;

  const task = new Promise<string>((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_FACE.width;
    canvas.height = CARD_FACE.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const spec = toSpec(suit, rank, theme);

    const finish = (img: HTMLImageElement | null) => {
      let url = '';
      try {
        drawCardFaceCanvas(ctx, spec, img);
        url = canvas.toDataURL('image/png');
      } catch {
        drawCardFaceCanvas(ctx, spec);
        url = canvas.toDataURL('image/png');
      }
      // Кешируем только полноценную сборку с артом; без арта — не запоминаем, чтобы перерисовать позже.
      if (url && img) rememberComposed(key, url);
      resolve(url);
    };

    loadThemeImage(theme, themeId)
      .then((img) => finish(img))
      .catch(() => finish(null));
  });

  composedInflight.set(key, task);
  task.finally(() => composedInflight.delete(key)).catch(() => {});
  return task;
}

export type ThemeCardPrecomposeSpec = {
  suit: string;
  rank: string;
  theme: NftThemeKey;
  themeId: number;
};

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 120 });
    } else {
      setTimeout(resolve, 0);
    }
  });

/**
 * Фоновая предсборка карт (колода игрока при старте игры): по одной, с уступкой
 * главному потоку, чтобы стол не подтормаживал. Повторные вызовы дешёвые — всё в кеше.
 */
export async function precomposeThemeCards(specs: ThemeCardPrecomposeSpec[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const pending = specs.filter(
    (s) => !composedCardCache.has(themeCardCacheKey(s.suit, s.rank, s.theme, s.themeId))
  );
  if (pending.length === 0) return;

  // Сначала прогреваем арты тем (сетевые запросы параллельно), потом рисуем карты.
  const themes = new Map<string, ThemeCardPrecomposeSpec>();
  for (const s of pending) themes.set(`${s.theme}/${s.themeId}`, s);
  await Promise.allSettled([...themes.values()].map((s) => loadThemeImage(s.theme, s.themeId)));

  for (const s of pending) {
    try {
      await generateThemeCardImageDataUrl(s.suit, s.rank, s.theme, s.themeId);
    } catch {
      /* карта дорисуется при монтировании */
    }
    await yieldToBrowser();
  }
}
