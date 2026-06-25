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
