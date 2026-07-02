import {
  ANCHOR_USD_RUB,
  COINS_PER_USD,
  CRYPTO_COINGECKO_IDS,
  PRICING_TTL_SECONDS,
} from '@/lib/pricing/constants';
import {
  getMemoryRates,
  loadRatesFromRedis,
  saveRatesToRedis,
} from '@/lib/pricing/exchange-rate-store';
import type { CryptoRateEntry, ExchangeRateSnapshot } from '@/lib/pricing/types';

const FALLBACK_USD_PRICES: Record<string, number> = {
  BTC: 97_000,
  ETH: 3_500,
  SOL: 150,
  USDT: 1,
  TRX: 0.25,
  TON: 4,
  GRAM: 4,
};

function normalizeCoinKey(coin: string): string {
  const key = coin.toUpperCase();
  if (key === 'GRAM') return 'TON';
  return key;
}

function buildSnapshot(
  usdRub: number,
  usdPrices: Record<string, number>,
  source: string
): ExchangeRateSnapshot {
  const safeUsdRub = usdRub > 0 ? usdRub : ANCHOR_USD_RUB;
  const coinsPerRub = COINS_PER_USD / safeUsdRub;
  const crypto: Record<string, CryptoRateEntry> = {};

  for (const [symbol, usdPrice] of Object.entries(usdPrices)) {
    const safeUsd = usdPrice > 0 ? usdPrice : 1;
    const entry: CryptoRateEntry = {
      symbol,
      usdPrice: safeUsd,
      rubPrice: safeUsd * safeUsdRub,
      coinsPerUnit: Math.floor(COINS_PER_USD / safeUsd),
    };
    crypto[symbol] = entry;
    if (symbol === 'TON') {
      crypto.GRAM = { ...entry, symbol: 'GRAM' };
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    source,
    usdRub: safeUsdRub,
    coinsPerUsd: COINS_PER_USD,
    coinsPerRub,
    crypto,
  };
}

function fallbackSnapshot(): ExchangeRateSnapshot {
  return buildSnapshot(ANCHOR_USD_RUB, FALLBACK_USD_PRICES, 'fallback');
}

async function fetchCbrUsdRub(): Promise<number | null> {
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { Valute?: { USD?: { Value?: number } } };
    const value = data.Valute?.USD?.Value;
    return typeof value === 'number' && value > 0 ? value : null;
  } catch {
    return null;
  }
}

async function fetchCoinGeckoPrices(): Promise<{ usdRub: number; usdPrices: Record<string, number> } | null> {
  const ids = [...new Set(Object.values(CRYPTO_COINGECKO_IDS))].join(',');
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,rub`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
        headers: { Accept: 'application/json' },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number; rub?: number }>;

    const usdPrices: Record<string, number> = {};
    for (const [symbol, geckoId] of Object.entries(CRYPTO_COINGECKO_IDS)) {
      const row = data[geckoId];
      if (row?.usd && row.usd > 0) {
        usdPrices[normalizeCoinKey(symbol)] = row.usd;
      }
    }

    const tetherRub = data.tether?.rub;
    const btcRub = data.bitcoin?.rub;
    const btcUsd = data.bitcoin?.usd;
    let usdRub = tetherRub && tetherRub > 0 ? tetherRub : null;
    if (!usdRub && btcRub && btcUsd && btcUsd > 0) {
      usdRub = btcRub / btcUsd;
    }

    if (Object.keys(usdPrices).length === 0) return null;
    return { usdRub: usdRub ?? ANCHOR_USD_RUB, usdPrices };
  } catch {
    return null;
  }
}

/** Загрузить свежие курсы с внешних API и сохранить */
export async function refreshExchangeRates(): Promise<ExchangeRateSnapshot> {
  const [gecko, cbrUsdRub] = await Promise.all([fetchCoinGeckoPrices(), fetchCbrUsdRub()]);

  if (gecko) {
    const usdRub = cbrUsdRub ?? gecko.usdRub;
    const snapshot = buildSnapshot(usdRub, gecko.usdPrices, cbrUsdRub ? 'coingecko+cbr' : 'coingecko');
    await saveRatesToRedis(snapshot);
    return snapshot;
  }

  const memory = getMemoryRates();
  if (memory) return memory;

  const fallback = fallbackSnapshot();
  await saveRatesToRedis(fallback);
  return fallback;
}

function isStale(snapshot: ExchangeRateSnapshot): boolean {
  const ageMs = Date.now() - new Date(snapshot.updatedAt).getTime();
  return ageMs > PRICING_TTL_SECONDS * 1000;
}

/** Актуальный снимок курсов (из Redis / памяти / API) */
export async function getExchangeRates(options?: { forceRefresh?: boolean }): Promise<ExchangeRateSnapshot> {
  if (options?.forceRefresh) {
    return refreshExchangeRates();
  }

  const cached = (await loadRatesFromRedis()) ?? getMemoryRates();
  if (cached && !isStale(cached)) {
    return cached;
  }

  if (cached && isStale(cached)) {
    try {
      return await refreshExchangeRates();
    } catch {
      return cached;
    }
  }

  try {
    return await refreshExchangeRates();
  } catch {
    return fallbackSnapshot();
  }
}

export function coinsFromRub(rub: number, snapshot: ExchangeRateSnapshot): number {
  if (!Number.isFinite(rub) || rub <= 0) return 0;
  return Math.floor(rub * snapshot.coinsPerRub);
}

export function coinsFromUsd(usd: number, snapshot: ExchangeRateSnapshot): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.floor(usd * snapshot.coinsPerUsd);
}

export function coinsFromCrypto(
  coin: string,
  amount: number,
  snapshot: ExchangeRateSnapshot
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const key = normalizeCoinKey(coin);
  const entry = snapshot.crypto[key] ?? snapshot.crypto.USDT;
  const rate = entry?.coinsPerUnit ?? Math.floor(COINS_PER_USD);
  return Math.floor(amount * rate);
}

export function getCryptoUsdPrice(coin: string, snapshot: ExchangeRateSnapshot): number {
  const key = normalizeCoinKey(coin);
  return snapshot.crypto[key]?.usdPrice ?? snapshot.crypto.USDT?.usdPrice ?? 1;
}

export function rubFromUsd(usd: number, snapshot: ExchangeRateSnapshot): number {
  return Math.round(usd * snapshot.usdRub * 100) / 100;
}

export function formatRateUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function snapshotForClient(snapshot: ExchangeRateSnapshot) {
  return snapshot;
}
