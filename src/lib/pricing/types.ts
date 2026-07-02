export type CryptoRateEntry = {
  symbol: string;
  usdPrice: number;
  rubPrice: number;
  coinsPerUnit: number;
};

export type ExchangeRateSnapshot = {
  updatedAt: string;
  source: string;
  usdRub: number;
  coinsPerUsd: number;
  coinsPerRub: number;
  crypto: Record<string, CryptoRateEntry>;
};

export type ExchangeRatesApiPayload = ExchangeRateSnapshot & {
  yookassaEnabled: boolean;
  nextRefreshHint: string;
};
