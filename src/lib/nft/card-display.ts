import type { Language } from '@/lib/i18n/translations';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

export function getNftSuitColor(suit: string): string {
  const colors: Record<string, string> = {
    hearts: '#ef4444',
    diamonds: '#f59e0b',
    clubs: '#22c55e',
    spades: '#3b82f6',
  };
  return colors[suit?.toLowerCase()] || '#94a3b8';
}

export function getNftSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit?.toLowerCase()] || '?';
}

/** Буква масти — без Unicode (Telegram / старые Android не ломают в □) */
export function getNftSuitAbbrev(suit: string): string {
  const map: Record<string, string> = {
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
    spades: 'S',
  };
  return map[suit?.toLowerCase()] || '?';
}

export function formatNftRankSuit(rank: string, suit: string): string {
  return formatNftCardName(rank, suit, 'ru');
}

export function getNftRankDisplay(rank: string): string {
  const map: Record<string, string> = {
    a: 'A',
    j: 'J',
    q: 'Q',
    k: 'K',
    A: 'A',
    J: 'J',
    Q: 'Q',
    K: 'K',
    ace: 'A',
    jack: 'J',
    queen: 'Q',
    king: 'K',
  };
  return map[rank] ?? rank?.toUpperCase?.() ?? rank;
}

/** Русское название ранга для витрины и акций */
export function getNftRankLabelRu(rank: string): string {
  const key = String(rank ?? '').toLowerCase();
  const map: Record<string, string> = {
    a: 'Туз',
    ace: 'Туз',
    k: 'Король',
    king: 'Король',
    q: 'Дама',
    queen: 'Дама',
    j: 'Валет',
    jack: 'Валет',
  };
  if (map[key]) return map[key];
  if (key === '10' || rank === '10') return '10';
  const num = parseInt(key, 10);
  if (!Number.isNaN(num) && num >= 2 && num <= 9) return String(num);
  return getNftRankDisplay(rank);
}

/** Родительный падеж масти: «дама пик», «семёрка червей» */
export function getNftSuitLabelRu(suit: string): string {
  const map: Record<string, string> = {
    hearts: 'червей',
    diamonds: 'бубен',
    clubs: 'треф',
    spades: 'пик',
  };
  return map[suit?.toLowerCase()] ?? suit;
}

const CARD_NAMES = {
  ru: {
    ranks: { jack: 'Валет', queen: 'Дама', king: 'Король', ace: 'Туз' },
    suits: { hearts: 'червей', diamonds: 'бубен', clubs: 'треф', spades: 'пик' },
  },
  en: {
    ranks: { jack: 'Jack', queen: 'Queen', king: 'King', ace: 'Ace' },
    suits: { hearts: 'hearts', diamonds: 'diamonds', clubs: 'clubs', spades: 'spades' },
  },
} as const;

/** Единое локализованное имя карты: «Валет треф» / “Jack of clubs”. */
export function formatNftCardName(
  rank: string,
  suit: string,
  language: Language = 'ru'
): string {
  const rankKey = normalizeRankToken(rank) || String(rank ?? '').toLowerCase();
  const suitKey = normalizeSuitToken(suit) || String(suit ?? '').toLowerCase();
  const dictionary = CARD_NAMES[language];
  const rankLabel =
    dictionary.ranks[rankKey as keyof typeof dictionary.ranks] ??
    getNftRankDisplay(rank);
  const suitLabel =
    dictionary.suits[suitKey as keyof typeof dictionary.suits] ??
    String(suit ?? '');

  return language === 'en'
    ? `${rankLabel} of ${suitLabel}`
    : `${rankLabel} ${suitLabel}`;
}

/** @deprecated Используйте formatNftCardName с выбранным языком. */
export function formatNftCardNameRu(rank: string, suit: string): string {
  return formatNftCardName(rank, suit, 'ru');
}

/** Заголовок лота / акции: «Дама пик · Покемон». */
export function formatNftCardTitle(
  rank: string,
  suit: string,
  themeLabel?: string,
  language: Language = 'ru'
): string {
  const base = formatNftCardName(rank, suit, language);
  const theme = themeLabel?.trim();
  return theme ? `${base} · ${theme}` : base;
}

/** @deprecated Используйте formatNftCardTitle с выбранным языком. */
export function formatNftCardTitleRu(rank: string, suit: string, themeLabel?: string): string {
  return formatNftCardTitle(rank, suit, themeLabel, 'ru');
}

export function getNftRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    pokemon: '⚡ Покемон',
    halloween: '🎃 Хеллоуин',
    starwars: '⚔️ Star Wars',
    simple: '🎴 Простая',
    common: 'Обычная',
    uncommon: 'Необычная',
    rare: 'Редкая',
    epic: 'Эпическая',
    legendary: '👑 Легендарная',
  };
  return labels[rarity?.toLowerCase()] || rarity;
}
