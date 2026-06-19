/**
 * Gram — новое имя нативного токена The Open Network (ранее Toncoin / TON).
 * Сеть по-прежнему TON; в БД/API legacy-ключ `TON` сохранён для совместимости.
 */
export const GRAM = {
  name: 'Gram',
  symbol: 'GRAM',
  icon: '/img/gram-icon.svg',
  color: '#30A1F5',
  /** Legacy network id в API, env и колонках price_ton */
  apiNetwork: 'TON' as const,
  networkLabel: 'The Open Network',
  connectProduct: 'TON Connect',
  walletLabel: 'Gram-кошелёк',
  coinsPerGram: 1000,
} as const;

export function formatGramAmount(amount: number | string): string {
  return `${amount} ${GRAM.symbol}`;
}

export function formatGramRate(): string {
  return `1 ${GRAM.name} = ${GRAM.coinsPerGram} монет`;
}

export function isGramNetwork(network: string | null | undefined): boolean {
  if (!network) return false;
  const n = network.toUpperCase();
  return n === 'TON' || n === 'GRAM';
}

export function gramDisplayFromApi(network: string | null | undefined): string {
  return isGramNetwork(network) ? GRAM.symbol : network ?? '';
}
