import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: '#be123c',
  diamonds: '#be123c',
  clubs: '#0f172a',
  spades: '#0f172a',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

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

export function generateBaseCardSvg(
  rankRaw: string,
  suit: string,
  rankNormalized: string,
  rarity = 'common'
): string {
  const normalizedSuit = normalizeSuitToken(suit);
  const rank = displayRank(rankRaw, rankNormalized);
  const suitSymbol = SUIT_SYMBOLS[normalizedSuit] ?? '?';
  const suitColor = SUIT_COLORS[normalizedSuit] ?? '#0f172a';
  const rarityColor = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fffef9"/>
      <stop offset="100%" stop-color="#f1ebe0"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="400" height="600" rx="20" fill="url(#bg)" filter="url(#shadow)"/>
  <rect x="10" y="10" width="380" height="580" rx="16" fill="none" stroke="${rarityColor}" stroke-width="5"/>
  <text x="42" y="78" font-family="Georgia, serif" font-size="58" font-weight="bold" fill="${suitColor}">${rank}</text>
  <text x="42" y="138" font-family="Georgia, serif" font-size="64" fill="${suitColor}">${suitSymbol}</text>
  <text x="200" y="340" font-family="Georgia, serif" font-size="160" fill="${suitColor}" opacity="0.22" text-anchor="middle">${suitSymbol}</text>
  <text x="358" y="548" font-family="Georgia, serif" font-size="58" font-weight="bold" fill="${suitColor}" text-anchor="end" transform="rotate(180 358 518)">${rank}</text>
  <text x="358" y="488" font-family="Georgia, serif" font-size="64" fill="${suitColor}" text-anchor="end" transform="rotate(180 358 458)">${suitSymbol}</text>
</svg>`;
}

function storageCandidates(suit: string, rankRaw: string, rankNormalized: string): string[] {
  const normalizedSuit = normalizeSuitToken(suit);
  const rankTokens = new Set<string>();
  for (const t of [rankRaw, rankNormalized, displayRank(rankRaw, rankNormalized)]) {
    if (!t) continue;
    rankTokens.add(t);
    rankTokens.add(t.toUpperCase());
    rankTokens.add(t.toLowerCase());
  }

  const paths: string[] = [];
  for (const rank of rankTokens) {
    paths.push(`base-cards/${normalizedSuit}/${rank}.png`);
    paths.push(`base-cards/${normalizedSuit}/${rank}.svg`);
  }
  return paths;
}

async function downloadFromStorage(path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.length ? buffer : null;
}

async function fetchPublicCardBuffer(
  rankRaw: string,
  suit: string,
  rankNormalized: string
): Promise<Buffer | null> {
  const normalizedSuit = normalizeSuitToken(suit);
  const rank = normalizeRankToken(rankNormalized || rankRaw);
  if (!rank || !normalizedSuit) return null;

  const localPath = `/img/cards/${rank}_of_${normalizedSuit}.png`;
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const urls = appBase ? [`${appBase}${localPath}`] : [];
  urls.push(localPath);

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 100) return buffer;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function resolveBaseCardBuffer(params: {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  rarity?: string;
}): Promise<{ buffer: Buffer; contentType: string; source: 'storage' | 'public' | 'generated' }> {
  const tried = new Set<string>();
  for (const path of storageCandidates(params.suit, params.rankRaw, params.rankNormalized)) {
    if (tried.has(path)) continue;
    tried.add(path);
    const buffer = await downloadFromStorage(path);
    if (buffer) {
      const contentType = path.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      return { buffer, contentType, source: 'storage' };
    }
  }

  const publicBuffer = await fetchPublicCardBuffer(
    params.rankRaw,
    params.suit,
    params.rankNormalized
  );
  if (publicBuffer) {
    return { buffer: publicBuffer, contentType: 'image/png', source: 'public' };
  }

  const svg = generateBaseCardSvg(
    params.rankRaw,
    params.suit,
    params.rankNormalized,
    params.rarity ?? 'common'
  );
  return {
    buffer: Buffer.from(svg, 'utf-8'),
    contentType: 'image/svg+xml',
    source: 'generated',
  };
}
