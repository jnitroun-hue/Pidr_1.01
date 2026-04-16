type CardAssetOptions = {
  image?: string;
  rank?: string | number;
  suit?: string;
  faceDown?: boolean;
};

const DEFAULT_CARD_BACK = '/img/cards/back.png';
const FALLBACK_CARD_BACK = '/img/card-back.svg';

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

function normalizeSuitToken(suit?: string) {
  return String(suit || '').toLowerCase();
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

