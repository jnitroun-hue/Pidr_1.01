/**
 * Стоимость генерации одной NFT-карты в крипте.
 * База — GRAM (ex-TON); SOL / TRX / USDT считаются по живому курсу.
 */

export const NFT_GEN_TON_COST: Record<string, number> = {
  pokemon: 0.5,
  halloween: 0.3,
  starwars: 0.3,
  legendary: 2,
};

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
