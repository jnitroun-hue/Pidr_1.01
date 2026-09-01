/**
 * Стоимость генерации одной NFT-карты в крипте.
 * База — GRAM (ex-TON); SOL / TRX / USDT считаются по живому курсу.
 */

import { cryptoAmountFromUsd, getCryptoUsdPrice, rubFromUsd } from '@/lib/pricing/exchange-rates';
import type { ExchangeRateSnapshot } from '@/lib/pricing/types';

export const NFT_GEN_TON_COST: Record<string, number> = {
  pokemon: 0.5,
  halloween: 0.3,
  starwars: 0.3,
  legendary: 2,
  unique: 0.8,
};

export const NFT_GEN_COIN_COST: Record<string, { single: number; deck: number }> = {
  pokemon: { single: 10000, deck: 400000 },
  halloween: { single: 5000, deck: 200000 },
  starwars: { single: 5000, deck: 200000 },
  legendary: { single: 50000, deck: 1000000 },
  unique: { single: 15000, deck: 400000 },
};

export const NFT_GEN_MAX_COUNT = 52;

export function nftGenUnitGram(theme: string): number {
  return NFT_GEN_TON_COST[theme] ?? 0.3;
}

export function nftGenUsd(theme: string, count: number, snapshot: ExchangeRateSnapshot): number {
  return nftGenUnitGram(theme) * getCryptoUsdPrice('TON', snapshot) * Math.max(1, count);
}

export function nftGenRub(theme: string, count: number, snapshot: ExchangeRateSnapshot): number {
  return Math.max(1, Math.ceil(rubFromUsd(nftGenUsd(theme, count, snapshot), snapshot)));
}

export function nftGenCryptoAmount(
  theme: string,
  coin: string,
  count: number,
  snapshot: ExchangeRateSnapshot | null
): number {
  const qty = Math.max(1, count);
  const unitGram = nftGenUnitGram(theme);
  if (coin === 'GRAM' || coin === 'TON') return Math.round(unitGram * qty * 1000) / 1000;
  const fallbackUsd: Record<string, number> = { SOL: 150, USDT: 1, TRX: 0.25, TON: 4 };
  const tonUsd = snapshot ? getCryptoUsdPrice('TON', snapshot) : fallbackUsd.TON;
  const usd = unitGram * tonUsd * qty;
  if (snapshot) return cryptoAmountFromUsd(coin, usd, snapshot);
  const unitUsd = fallbackUsd[coin] || 1;
  const raw = unitUsd > 0 ? usd / unitUsd : 0;
  if (coin === 'USDT' || coin === 'TRX') return Math.ceil(raw * 100) / 100;
  return Math.ceil(raw * 10000) / 10000;
}

export const NFT_GEN_CRYPTO_COINS = ['GRAM', 'SOL', 'TRX', 'USDT'] as const;
export type NftGenCryptoCoin = (typeof NFT_GEN_CRYPTO_COINS)[number];

export function normalizeGenCrypto(raw: string | null | undefined): NftGenCryptoCoin | 'TON' | null {
  const key = String(raw || '').trim().toUpperCase();
  if (key === 'TON' || key === 'GRAM') return key === 'TON' ? 'TON' : 'GRAM';
  if (key === 'SOL' || key === 'TRX' || key === 'USDT') return key;
  return null;
}

export function isTonFamily(coin: string): boolean {
  const key = coin.toUpperCase();
  return key === 'TON' || key === 'GRAM';
}
