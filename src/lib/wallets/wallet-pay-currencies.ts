/**
 * 6 популярных монет Telegram Wallet (как в @wallet).
 * Wallet Pay принимает оплату из кошелька — пользователь сам выбирает монету при подтверждении.
 */
import { GRAM } from '@/lib/crypto/gram-brand';

/** Игровых монет за 1 единицу крипты */
export const GAME_COINS_PER_CRYPTO: Record<string, number> = {
  USDT: 150,
  TON: GRAM.coinsPerGram,
  GRAM: GRAM.coinsPerGram,
  BTC: 9_000_000,
  ETH: 375_000,
  SOL: 30_000,
  TRX: 45,
};

/** Порядок как в Telegram Wallet → Popular */
export const TELEGRAM_WALLET_POPULAR = [
  'USDT',
  'ETH',
  'BTC',
  'TON',
  'TRX',
  'SOL',
] as const;

export type TelegramWalletPopularCoin = (typeof TELEGRAM_WALLET_POPULAR)[number];

/** Wallet Pay API: TON, USDT, BTC, USD, EUR */
export type WalletPayCurrencyCode = 'TON' | 'USDT' | 'BTC' | 'USD' | 'EUR';

/** USD-оценка для монет без прямого currencyCode в Wallet Pay */
const USD_PER_COIN: Record<string, number> = {
  ETH: 3500,
  SOL: 150,
  TRX: 0.25,
  USDT: 1,
  BTC: 100_000,
  TON: 4,
  GRAM: 4,
};

export function gameCoinsForDeposit(coin: string, amount: number): number {
  const key = coin.toUpperCase();
  const rate = GAME_COINS_PER_CRYPTO[key] ?? GAME_COINS_PER_CRYPTO.USDT;
  return Math.floor(amount * rate);
}

export function buildWalletPayAmount(coin: string, amount: number): {
  currencyCode: WalletPayCurrencyCode;
  amount: string;
  autoConversionCurrency?: 'TON' | 'USDT' | 'BTC';
} {
  const key = coin.toUpperCase();
  const normalized = key === 'GRAM' ? 'TON' : key;

  if (normalized === 'TON' || normalized === 'USDT' || normalized === 'BTC') {
    return {
      currencyCode: normalized as WalletPayCurrencyCode,
      amount: amount.toFixed(normalized === 'BTC' ? 8 : normalized === 'TON' ? 4 : 2),
      autoConversionCurrency: normalized as 'TON' | 'USDT' | 'BTC',
    };
  }

  const usd = amount * (USD_PER_COIN[key] ?? 1);
  return {
    currencyCode: 'USD',
    amount: Math.max(usd, 1.31).toFixed(2),
  };
}

export function walletPayMinAmountHint(coin: string): string {
  const key = coin.toUpperCase();
  if (key === 'BTC') return 'мин. ~$3';
  return 'мин. ~$1.30';
}
