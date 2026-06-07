type CardAssetOptions = {
  image?: string;
  rank?: string | number;
  suit?: string;
  faceDown?: boolean;
};

const DEFAULT_CARD_BACK = '/img/cards/back.png';
const FALLBACK_CARD_BACK = '/img/card-back.svg';

export function normalizeRankToken(rank?: string | number) {
  if (rank === undefined || rank === null) return '';
  const rankStr = String(rank).toLowerCase().trim();
  const rankNum = Number(rankStr);

  if (rankNum === 11 || rankStr === 'j' || rankStr === 'jack') return 'jack';
  if (rankNum === 12 || rankStr === 'q' || rankStr === 'queen') return 'queen';
  if (rankNum === 13 || rankStr === 'k' || rankStr === 'king') return 'king';
  if (rankNum === 14 || rankStr === 'a' || rankStr === 'ace') return 'ace';
  if (rankNum >= 2 && rankNum <= 10) return String(rankNum);

  return rankStr;
}

export function normalizeSuitToken(suit?: string) {
  const s = String(suit || '').toLowerCase().trim();
  if (s === 'h' || s === 'heart') return 'hearts';
  if (s === 'd' || s === 'diamond') return 'diamonds';
  if (s === 'c' || s === 'club') return 'clubs';
  if (s === 's' || s === 'spade') return 'spades';
  return s;
}

/** Ключ NFT-карты в колоде: `jack_of_hearts` */
export function buildNftDeckKey(rank?: string | number, suit?: string): string {
  const r = normalizeRankToken(rank);
  const s = normalizeSuitToken(suit);
  return r && s ? `${r}_of_${s}` : '';
}

export function deckEntriesToNftMap(
  deck: Array<{ rank?: string | number; suit?: string; image_url?: string }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of deck) {
    const key = buildNftDeckKey(entry.rank, entry.suit);
    if (key && entry.image_url) {
      map[key] = entry.image_url;
    }
  }
  return map;
}

function extractIdentityFromImage(image?: string): { rank: string; suit: string; rawName: string } {
  if (!image || image.startsWith('http://') || image.startsWith('https://')) {
    return { rank: '', suit: '', rawName: '' };
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
    return { rank: directMatch[1], suit: directMatch[2], rawName: normalized };
  }

  const reverseMatch = normalized.match(/^(clubs|diamonds|hearts|spades)_(ace|king|queen|jack|\d+)$/);
  if (reverseMatch) {
    return {
      rank: reverseMatch[2],
      suit: reverseMatch[1],
      rawName: `${reverseMatch[2]}_of_${reverseMatch[1]}`
    };
  }

  return { rank: '', suit: '', rawName: normalized };
}

function buildCardPath(rank?: string | number, suit?: string) {
  const normalizedRank = normalizeRankToken(rank);
  const normalizedSuit = normalizeSuitToken(suit);

  if (!normalizedRank || !normalizedSuit) {
    return '';
  }

  return `/img/cards/${normalizedRank}_of_${normalizedSuit}.png`;
}

export function getCardAssetSrc(options: CardAssetOptions) {
  const { image, rank, suit, faceDown } = options;

  if (image && (image.startsWith('http://') || image.startsWith('https://'))) {
    return image;
  }

  if (faceDown) {
    return DEFAULT_CARD_BACK;
  }

  const extracted = extractIdentityFromImage(image);
  if (extracted.rawName) {
    return `/img/cards/${extracted.rawName}.png`;
  }

  return buildCardPath(rank ?? extracted.rank, suit ?? extracted.suit) || FALLBACK_CARD_BACK;
}

