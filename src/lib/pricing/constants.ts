/** Якорь экономики: 1 USD = 4999 игровых монет */
export const COINS_PER_USD = 4999;

/** Референс для UI: при курсе 80 ₽/$ → 80 ₽ = 4999 монет */
export const ANCHOR_USD_RUB = 80;

/** Криптовалюты проекта → CoinGecko id */
export const CRYPTO_COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDT: 'tether',
  TRX: 'tron',
  TON: 'the-open-network',
  GRAM: 'the-open-network',
};

export const PRICING_REDIS_KEY = 'pricing:exchange_rates_v3';
export const PRICING_TTL_SECONDS = 24 * 60 * 60;
