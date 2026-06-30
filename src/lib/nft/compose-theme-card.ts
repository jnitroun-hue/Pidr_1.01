import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET, POKEMON_STORAGE_BUCKET } from '@/lib/nft/constants';
import {
  buildCardFaceSvg,
  CARD_FACE,
  type CardFaceSpec,
} from '@/lib/nft/card-face-builder';
import {
  getThemeAssetRelativePath,
  NFT_THEME_CONFIG,
  pickRandomThemeAsset,
  pickSeededThemeAsset,
  type NftThemeKey,
  type ThemeAssetPick,
} from '@/lib/nft/theme-config';

const REMOTE_FETCH_TIMEOUT_MS = 2500;
const COMPOSE_VERSION = 2;

export { COMPOSE_VERSION };

export async function downloadStorageBuffer(
  bucket: string,
  objectPath: string
): Promise<Buffer | null> {
  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(objectPath);
    if (error || !data) return null;
    const buffer = Buffer.from(await data.arrayBuffer());
    return buffer.length > 100 ? buffer : null;
  } catch {
    return null;
  }
}

async function fetchRemoteBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.length > 100 ? buffer : null;
  } catch {
    return null;
  }
}

export async function loadThemeImageBuffer(pick: ThemeAssetPick): Promise<Buffer> {
  const cfg = NFT_THEME_CONFIG[pick.theme];
  const fileName = `${cfg.prefix}${pick.themeId}.png`;
  const relativePath = getThemeAssetRelativePath(pick);

  const localPath = path.join(process.cwd(), 'public', cfg.folder, fileName);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  const storageCandidates = [
    { bucket: NFT_STORAGE_BUCKET, path: `themes/${relativePath}` },
    { bucket: NFT_STORAGE_BUCKET, path: relativePath },
    { bucket: POKEMON_STORAGE_BUCKET, path: fileName },
    { bucket: POKEMON_STORAGE_BUCKET, path: `${pick.themeId}.png` },
  ];

  for (const { bucket, path: objectPath } of storageCandidates) {
    const buffer = await downloadStorageBuffer(bucket, objectPath);
    if (buffer) return buffer;
  }

  const appBases = [
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ''),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    'https://pidr-1-01.vercel.app',
    'https://pidr1-01.ru',
  ].filter(Boolean) as string[];

  for (const base of appBases) {
    const buffer = await fetchRemoteBuffer(`${base}/${relativePath}`);
    if (buffer) return buffer;
  }

  throw new Error(`Ассет темы не найден: ${relativePath}`);
}

function toCardFaceSpec(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  theme?: NftThemeKey;
}): CardFaceSpec {
  return {
    suit: params.suit,
    rankRaw: params.rankRaw,
    rankNormalized: params.rankNormalized,
    themeLabel: params.theme ? NFT_THEME_CONFIG[params.theme].name : undefined,
  };
}

/** Карта только с рангом/мастью — без внешних ассетов (fallback) */
export async function composeSvgOnlyCardBuffer(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  themeLabel?: string;
}): Promise<Buffer> {
  const spec: CardFaceSpec = {
    suit: params.suit,
    rankRaw: params.rankRaw,
    rankNormalized: params.rankNormalized,
    themeLabel: params.themeLabel,
  };
  return sharp(Buffer.from(buildCardFaceSvg(spec))).png().toBuffer();
}

export async function composeThemeCardBuffer(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  theme: NftThemeKey;
  themeId: number;
}): Promise<Buffer> {
  const { theme, themeId } = params;
  const themeImage = await loadThemeImageBuffer({ theme, themeId });
  const spec = toCardFaceSpec({ ...params, theme });
  const { art } = CARD_FACE;

  const themeResized = await sharp(themeImage)
    .resize(art.size, art.size, {
      fit: 'contain',
      background: { r: 241, g: 245, b: 249, alpha: 1 },
    })
    .png()
    .toBuffer();

  return sharp(Buffer.from(buildCardFaceSvg(spec)))
    .composite([{ input: themeResized, top: art.top, left: art.left }])
    .png()
    .toBuffer();
}

/** Случайная тематическая карта из общего пула (Premium free roll) */
export async function composeRandomThemedCardBuffer(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  maxAttempts?: number;
}): Promise<{ buffer: Buffer; pick: ThemeAssetPick }> {
  const maxAttempts = params.maxAttempts ?? 8;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const pick = pickRandomThemeAsset();
    try {
      const buffer = await composeThemeCardBuffer({
        suit: params.suit,
        rankRaw: params.rankRaw,
        rankNormalized: params.rankNormalized,
        theme: pick.theme,
        themeId: pick.themeId,
      });
      return { buffer, pick };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️ [compose-theme] попытка ${attempt + 1} (${pick.theme}/${pick.themeId}):`, lastError.message);
    }
  }

  throw lastError ?? new Error('Не удалось собрать тематическую карту');
}

/** Тема из seed акции дня + запасные попытки */
export async function composeSeededThemeCardBuffer(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  seed: number;
  maxAttempts?: number;
}): Promise<{ buffer: Buffer; pick: ThemeAssetPick }> {
  const maxAttempts = params.maxAttempts ?? 6;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const pick =
      attempt === 0
        ? pickSeededThemeAsset(params.seed >>> 4)
        : pickRandomThemeAsset();
    try {
      const buffer = await composeThemeCardBuffer({
        suit: params.suit,
        rankRaw: params.rankRaw,
        rankNormalized: params.rankNormalized,
        theme: pick.theme,
        themeId: pick.themeId,
      });
      return { buffer, pick };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `⚠️ [compose-seeded] попытка ${attempt + 1} (${pick.theme}/${pick.themeId}):`,
        lastError.message
      );
    }
  }

  throw lastError ?? new Error('Не удалось собрать карту акции дня');
}
