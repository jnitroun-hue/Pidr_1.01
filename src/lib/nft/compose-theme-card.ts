import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET, POKEMON_STORAGE_BUCKET } from '@/lib/nft/constants';
import {
  getThemeAssetRelativePath,
  NFT_THEME_CONFIG,
  pickRandomThemeAsset,
  type NftThemeKey,
  type ThemeAssetPick,
} from '@/lib/nft/theme-config';

function displayRank(rankRaw: string, rankNormalized: string): string {
  if (rankRaw === '10' || rankNormalized === '10') return '10';
  const map: Record<string, string> = {
    jack: 'J',
    queen: 'Q',
    king: 'K',
    ace: 'A',
  };
  return map[rankNormalized] ?? rankRaw.toUpperCase();
}

function suitSymbol(suit: string): string {
  const map: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return map[suit] ?? suit;
}

function suitColor(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#ef4444' : '#000000';
}

async function downloadFromStorage(bucket: string, objectPath: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(objectPath);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.length ? buffer : null;
}

async function fetchRemoteBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.length > 100 ? buffer : null;
  } catch {
    return null;
  }
}

async function loadThemeImageBuffer(pick: ThemeAssetPick): Promise<Buffer> {
  const cfg = NFT_THEME_CONFIG[pick.theme];
  const fileName = `${cfg.prefix}${pick.themeId}.png`;
  const relativePath = getThemeAssetRelativePath(pick);

  const localPath = path.join(process.cwd(), 'public', cfg.folder, fileName);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
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

  const storageCandidates = [
    { bucket: NFT_STORAGE_BUCKET, path: `themes/${relativePath}` },
    { bucket: NFT_STORAGE_BUCKET, path: relativePath },
    { bucket: POKEMON_STORAGE_BUCKET, path: fileName },
    { bucket: POKEMON_STORAGE_BUCKET, path: `${pick.themeId}.png` },
  ];

  for (const { bucket, path: objectPath } of storageCandidates) {
    const buffer = await downloadFromStorage(bucket, objectPath);
    if (buffer) return buffer;
  }

  throw new Error(`Ассет темы не найден: ${relativePath}`);
}

export async function composeThemeCardBuffer(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  theme: NftThemeKey;
  themeId: number;
}): Promise<Buffer> {
  const { suit, rankRaw, rankNormalized, theme, themeId } = params;
  const pick: ThemeAssetPick = { theme, themeId };
  const themeImage = await loadThemeImageBuffer(pick);

  const rank = displayRank(rankRaw, rankNormalized);
  const symbol = suitSymbol(suit);
  const color = suitColor(suit);

  const baseSvg = `
    <svg width="300" height="420">
      <rect width="300" height="420" fill="#ffffff"/>
      <rect x="4" y="4" width="292" height="412" fill="none" stroke="#000000" stroke-width="8"/>
      <text x="20" y="50" font-family="Arial" font-size="40" font-weight="bold" fill="${color}">${rank}</text>
      <text x="20" y="90" font-family="Arial" font-size="36" font-weight="bold" fill="${color}">${symbol}</text>
      <text x="260" y="400" font-family="Arial" font-size="40" font-weight="bold" fill="${color}" text-anchor="end">${rank}</text>
      <text x="260" y="360" font-family="Arial" font-size="36" font-weight="bold" fill="${color}" text-anchor="end">${symbol}</text>
    </svg>`;

  const themeResized = await sharp(themeImage)
    .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  return sharp(Buffer.from(baseSvg))
    .composite([{ input: themeResized, top: 110, left: 50 }])
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
