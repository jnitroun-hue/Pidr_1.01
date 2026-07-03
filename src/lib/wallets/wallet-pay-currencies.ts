/**
 * Курсы для Wallet Pay и крипто-пополнения.
 * Источник истины: src/lib/pricing/exchange-rates.ts (обновление раз в 24 ч).
 */
import { GRAM } from '@/lib/crypto/gram-brand';
import { getExchangeRates, coinsFromCrypto, getCryptoUsdPrice, coinsPerUnitForDeposit } from '@/lib/pricing/exchange-rates';
import type { ExchangeRateSnapshot } from '@/lib/pricing/types';

/** @deprecated Используйте getExchangeRates() — оставлено для совместимости импортов */
export const GAME_COINS_PER_CRYPTO: Record<string, number> = {
  USDT: 4999,
  TON: 1250,
  GRAM: GRAM.coinsPerGram,
  BTC: 51,
  ETH: 1428,
  SOL: 33,
  TRX: 19996,
};

export const TELEGRAM_WALLET_POPULAR = [
  'USDT',
  'ETH',
  'BTC',
  'TON',
  'TRX',
  'SOL',
] as const;

export type TelegramWalletPopularCoin = (typeof TELEGRAM_WALLET_POPULAR)[number];
export type WalletPayCurrencyCode = 'TON' | 'USDT' | 'BTC' | 'USD' | 'EUR';

export async function gameCoinsForDepositAsync(
  coin: string,
  amount: number,
  snapshot?: ExchangeRateSnapshot
): Promise<number> {
  const rates = snapshot ?? (await getExchangeRates());
  return coinsFromCrypto(coin, amount, rates);
}

/** Синхронный расчёт — передайте snapshot с клиента / из API */
export function gameCoinsForDeposit(
  coin: string,
  amount: number,
  snapshot?: ExchangeRateSnapshot
): number {
  if (snapshot) {
    return coinsFromCrypto(coin, amount, snapshot);
  }
  const key = coin.toUpperCase() === 'GRAM' ? 'TON' : coin.toUpperCase();
  const rate = GAME_COINS_PER_CRYPTO[key] ?? GAME_COINS_PER_CRYPTO.USDT;
  return Math.floor(amount * rate);
}

export async function buildWalletPayAmountAsync(
  coin: string,
  amount: number,
  snapshot?: ExchangeRateSnapshot
): Promise<{
  currencyCode: WalletPayCurrencyCode;
  amount: string;
  autoConversionCurrency?: 'TON' | 'USDT' | 'BTC';
}> {
  const rates = snapshot ?? (await getExchangeRates());
  return buildWalletPayAmount(coin, amount, rates);
}

export function buildWalletPayAmount(
  coin: string,
  amount: number,
  snapshot?: ExchangeRateSnapshot
): {
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

  const usdPrice = snapshot
    ? getCryptoUsdPrice(key, snapshot)
    : (GAME_COINS_PER_CRYPTO[key] ? 4999 / GAME_COINS_PER_CRYPTO[key] : 1);
  const usd = amount * usdPrice;
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

export function getCoinsPerCryptoFromSnapshot(
  coin: string,
  snapshot: ExchangeRateSnapshot
): number {
  return coinsPerUnitForDeposit(coin, snapshot);
}
