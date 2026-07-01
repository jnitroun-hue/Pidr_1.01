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
  return `${getNftRankDisplay(rank)}${getNftSuitAbbrev(suit)}`;
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
