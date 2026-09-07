import {
  precomposeThemeCards,
  type ThemeCardPrecomposeSpec,
} from '@/lib/nft/generate-theme-card-client';
import { getThemeAssetCandidateUrls } from '@/lib/nft/theme-asset-urls';
import { isAnimatedNftTheme, resolveThemeFromMetadata } from '@/lib/nft/theme-config';
import type { NftDeckVisualMap } from '@/lib/game/cardAssets';

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
const RANKS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'jack', 'queen', 'king', 'ace',
] as const;

let standardPreloaded = false;

/** Прогрев локальных PNG — мгновенное отображение без ожидания NFT */
export function preloadStandardCardAssets(): void {
  if (typeof window === 'undefined' || standardPreloaded) return;
  standardPreloaded = true;

  const urls = ['/img/cards/back.png'];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      urls.push(`/img/cards/${rank}_of_${suit}.png`);
    }
  }

  for (const url of urls) {
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }
}

export function preloadNftCardUrls(urls: string[]): void {
  if (typeof window === 'undefined') return;
  const seen = new Set<string>();
  for (const url of urls) {
    if (!url || seen.has(url) || !url.startsWith('http')) continue;
    seen.add(url);
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }
}

const DECK_CACHE_KEY = 'pidr_nft_deck_cache_v1';

function currentUserCacheKey(): string {
  if (typeof window === 'undefined') return 'ssr';
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (tgId) return `tg:${tgId}`;
  const vkId = new URLSearchParams(window.location.search).get('vk_user_id');
  if (vkId) return `vk:${vkId}`;
  return 'web';
}

/** Последняя известная NFT-колода — чтобы карты были на столе ещё до ответа /api/user/deck. */
export function readCachedNftDeck(): NftDeckVisualMap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DECK_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: string; deck?: NftDeckVisualMap };
    if (parsed?.user !== currentUserCacheKey() || !parsed.deck) return null;
    return parsed.deck;
  } catch {
    return null;
  }
}

export function writeCachedNftDeck(deck: NftDeckVisualMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DECK_CACHE_KEY, JSON.stringify({ user: currentUserCacheKey(), deck }));
  } catch {
    /* переполнение storage — не критично */
  }
}

let deckWarmupInflight: Promise<void> | null = null;

/**
 * Полный прогрев NFT-колоды игрока: серверные PNG — в кеш браузера,
 * тематические карты — предсобираются на canvas в фоне, анимированные — грузим GIF.
 * После этого карты на столе появляются сразу, без сборки при монтировании.
 */
export function warmupNftDeck(deck: NftDeckVisualMap): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const entries = Object.entries(deck);
  if (entries.length === 0) return Promise.resolve();

  preloadNftCardUrls(entries.map(([, v]) => v.imageUrl));

  const specs: ThemeCardPrecomposeSpec[] = [];
  const animatedUrls: string[] = [];
  for (const [key, visual] of entries) {
    const [rank, suit] = key.split('_of_');
    if (!rank || !suit) continue;
    const info = resolveThemeFromMetadata(visual.metadata, visual.rarity, visual.imageUrl);
    if (!info) continue;
    if (isAnimatedNftTheme(info.theme)) {
      animatedUrls.push(getThemeAssetCandidateUrls(info.theme, info.themeId)[0]);
      continue;
    }
    specs.push({ suit, rank, theme: info.theme, themeId: info.themeId });
  }

  for (const url of new Set(animatedUrls)) {
    const img = new window.Image();
    img.decoding = 'async';
    img.src = url;
  }

  if (specs.length === 0) return Promise.resolve();

  const run = () =>
    precomposeThemeCards(specs).catch((err) => {
      console.warn('⚠️ [warmupNftDeck] предсборка колоды:', err);
    });

  // Не запускаем две предсборки параллельно (store и страница игры грузят колоду независимо).
  deckWarmupInflight = deckWarmupInflight ? deckWarmupInflight.then(run) : run();
  return deckWarmupInflight;
}
