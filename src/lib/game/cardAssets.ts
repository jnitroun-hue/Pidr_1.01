const cardFrontCache = new Map<string, string>();
let cardBackCache = '';

type CardAssetOptions = {
  image?: string;
  rank?: string | number;
  suit?: string;
  faceDown?: boolean;
};

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeRankToken(rank?: string | number) {
  if (rank === undefined || rank === null) return '';
  const rankStr = String(rank).toLowerCase();
  const rankNum = Number(rankStr);

  if (rankNum === 11 || rankStr === 'j' || rankStr === 'jack') return 'jack';
  if (rankNum === 12 || rankStr === 'q' || rankStr === 'queen') return 'queen';
  if (rankNum === 13 || rankStr === 'k' || rankStr === 'king') return 'king';
  if (rankNum === 14 || rankStr === 'a' || rankStr === 'ace') return 'ace';
  if (rankNum >= 2 && rankNum <= 10) return String(rankNum);

  return rankStr;
}

function formatRankLabel(rank?: string | number) {
  const token = normalizeRankToken(rank);

  if (token === 'jack') return 'J';
  if (token === 'queen') return 'Q';
  if (token === 'king') return 'K';
  if (token === 'ace') return 'A';

  return token ? token.toUpperCase() : '?';
}

function normalizeSuitToken(suit?: string) {
  return String(suit || '').toLowerCase();
}

function getSuitSymbol(suit?: string) {
  switch (normalizeSuitToken(suit)) {
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
    case 'spades':
      return '♠';
    default:
      return '?';
  }
}

function getSuitColor(suit?: string) {
  const normalizedSuit = normalizeSuitToken(suit);
  return normalizedSuit === 'hearts' || normalizedSuit === 'diamonds' ? '#dc2626' : '#0f172a';
}

function extractIdentityFromImage(image?: string) {
  if (!image || image.startsWith('http://') || image.startsWith('https://')) {
    return { rank: '', suit: '' };
  }

  const normalized = image
    .replace('(open)', '')
    .replace('(closed)', '')
    .replace('.png', '')
    .replace('/img/cards/', '')
    .split('/')
    .pop() || '';

  const directMatch = normalized.match(/^(ace|king|queen|jack|\d+)_of_(clubs|diamonds|hearts|spades)$/);
  if (directMatch) {
    return { rank: directMatch[1], suit: directMatch[2] };
  }

  const reverseMatch = normalized.match(/^(clubs|diamonds|hearts|spades)_(ace|king|queen|jack|\d+)$/);
  if (reverseMatch) {
    return { rank: reverseMatch[2], suit: reverseMatch[1] };
  }

  return { rank: '', suit: '' };
}

function buildCardBackSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">
      <defs>
        <linearGradient id="card-back-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="55%" stop-color="#172554" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
        <linearGradient id="card-back-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
        <pattern id="diamond-grid" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="rgba(255,255,255,0.02)" />
          <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255,255,255,0.12)" stroke-width="3" />
        </pattern>
      </defs>
      <rect x="4" y="4" width="112" height="172" rx="14" fill="url(#card-back-bg)" stroke="#e2e8f0" stroke-width="3" />
      <rect x="10" y="10" width="100" height="160" rx="10" fill="none" stroke="url(#card-back-frame)" stroke-width="2.5" />
      <rect x="16" y="16" width="88" height="148" rx="8" fill="url(#diamond-grid)" stroke="rgba(255,255,255,0.12)" />
      <circle cx="60" cy="90" r="27" fill="rgba(255,255,255,0.08)" stroke="rgba(253,224,71,0.7)" stroke-width="2" />
      <path d="M60 67 L72 90 L60 113 L48 90 Z" fill="#fbbf24" opacity="0.95" />
      <circle cx="60" cy="90" r="10" fill="#38bdf8" opacity="0.85" />
    </svg>
  `;
}

function buildCardFrontSvg(rank?: string | number, suit?: string) {
  const rankLabel = formatRankLabel(rank);
  const suitSymbol = getSuitSymbol(suit);
  const suitColor = getSuitColor(suit);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">
      <defs>
        <linearGradient id="front-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f8fafc" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="112" height="172" rx="14" fill="url(#front-shine)" stroke="#cbd5e1" stroke-width="3" />
      <rect x="10" y="10" width="100" height="160" rx="10" fill="none" stroke="rgba(15,23,42,0.08)" stroke-width="1.5" />
      <text x="18" y="30" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="${suitColor}">${rankLabel}</text>
      <text x="19" y="49" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${suitColor}">${suitSymbol}</text>
      <text x="102" y="150" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="${suitColor}">${rankLabel}</text>
      <text x="101" y="131" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${suitColor}">${suitSymbol}</text>
      <text x="60" y="102" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="${suitColor}" opacity="0.9">${suitSymbol}</text>
      <text x="60" y="132" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${suitColor}" opacity="0.18">${rankLabel}</text>
    </svg>
  `;
}

export function getCardAssetSrc(options: CardAssetOptions) {
  const { image, rank, suit, faceDown } = options;

  if (image && (image.startsWith('http://') || image.startsWith('https://'))) {
    return image;
  }

  if (faceDown) {
    if (!cardBackCache) {
      cardBackCache = encodeSvg(buildCardBackSvg());
    }
    return cardBackCache;
  }

  const extracted = extractIdentityFromImage(image);
  const normalizedRank = normalizeRankToken(rank ?? extracted.rank);
  const normalizedSuit = normalizeSuitToken(suit ?? extracted.suit);
  const cacheKey = `${normalizedRank}:${normalizedSuit}`;

  if (!normalizedRank || !normalizedSuit) {
    if (!cardBackCache) {
      cardBackCache = encodeSvg(buildCardBackSvg());
    }
    return cardBackCache;
  }

  if (!cardFrontCache.has(cacheKey)) {
    cardFrontCache.set(cacheKey, encodeSvg(buildCardFrontSvg(normalizedRank, normalizedSuit)));
  }

  return cardFrontCache.get(cacheKey)!;
}

