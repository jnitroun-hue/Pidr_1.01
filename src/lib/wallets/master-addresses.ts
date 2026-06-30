/**
 * Единый источник master-адресов для приёма депозитов.
 * Только server-side env — без захардкоженных fallback-адресов.
 */

import { GRAM } from '@/lib/crypto/gram-brand';

export type DepositCoinKey = 'GRAM' | 'TON' | 'ETH' | 'SOL' | 'USDT' | 'TRX' | 'BTC';

export type ResolvedMasterAddress = {
  coin: DepositCoinKey;
  /** Legacy api id (TON для Gram) */
  apiKey: string;
  network: string;
  address: string;
  envKey: string;
  memoHint?: string;
};

const COIN_ALIASES: Record<string, DepositCoinKey> = {
  GRAM: 'GRAM',
  TON: 'TON',
  ETH: 'ETH',
  ETHEREUM: 'ETH',
  SOL: 'SOL',
  SOLANA: 'SOL',
  USDT: 'USDT',
  TRX: 'TRX',
  TRON: 'TRX',
  BTC: 'BTC',
  BITCOIN: 'BTC',
};

/** Env-переменные по приоритету для каждой монеты */
const ENV_KEYS: Record<DepositCoinKey, string[]> = {
  GRAM: [
    'MASTER_TON_ADDRESS',
    'MASTER_GRAM_ADDRESS',
    'TON_MASTER_ADDRESS',
    'MASTER_TON_WALLET',
    'TON_MASTER_WALLET',
  ],
  TON: [
    'MASTER_TON_ADDRESS',
    'MASTER_GRAM_ADDRESS',
    'TON_MASTER_ADDRESS',
    'MASTER_TON_WALLET',
    'TON_MASTER_WALLET',
  ],
  ETH: [
    'MASTER_ETH_ADDRESS',
    'ETH_MASTER_ADDRESS',
    'MASTER_ETH_WALLET',
    'ETH_MASTER_WALLET',
  ],
  SOL: [
    'MASTER_SOL_ADDRESS',
    'MASTER_SOLANA_ADDRESS',
    'SOL_MASTER_ADDRESS',
    'MASTER_SOLANA_WALLET',
    'SOL_MASTER_WALLET',
  ],
  USDT: [
    'MASTER_USDT_ADDRESS',
    'MASTER_USDT_TRC20_ADDRESS',
    'USDT_MASTER_ADDRESS',
    'MASTER_TRON_USDT_ADDRESS',
    'MASTER_TRX_ADDRESS',
    'MASTER_TRON_ADDRESS',
  ],
  TRX: [
    'MASTER_TRX_ADDRESS',
    'MASTER_TRON_ADDRESS',
    'MASTER_TRX_WALLET',
    'MASTER_TRON_WALLET',
    'TRON_MASTER_ADDRESS',
  ],
  BTC: [
    'MASTER_BTC_ADDRESS',
    'BTC_MASTER_ADDRESS',
    'MASTER_BTC_WALLET',
    'BTC_MASTER_WALLET',
  ],
};

const NETWORK_LABELS: Record<DepositCoinKey, string> = {
  GRAM: GRAM.networkLabel,
  TON: GRAM.networkLabel,
  ETH: 'Ethereum (ERC-20)',
  SOL: 'Solana (SPL)',
  USDT: 'Tron (TRC-20)',
  TRX: 'Tron (TRC-20)',
  BTC: 'Bitcoin',
};

export function normalizeDepositCoin(raw: string | null | undefined): DepositCoinKey | null {
  if (!raw) return null;
  return COIN_ALIASES[raw.trim().toUpperCase()] ?? null;
}

function normalizeTonAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.startsWith('UQ')) {
    return `EQ${trimmed.slice(2)}`;
  }
  return trimmed;
}

function readEnvAddress(keys: string[]): { address: string; envKey: string } | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return { address: value, envKey: key };
    }
  }
  return null;
}

/** Резолв master-адреса из env (null если не настроен) */
export function resolveMasterAddress(rawCoin: string): ResolvedMasterAddress | null {
  const coin = normalizeDepositCoin(rawCoin);
  if (!coin) return null;

  const found = readEnvAddress(ENV_KEYS[coin]);
  if (!found) return null;

  let address = found.address;
  if (coin === 'GRAM' || coin === 'TON') {
    address = normalizeTonAddress(address);
  }

  const apiKey = coin === 'GRAM' ? 'TON' : coin;

  return {
    coin,
    apiKey,
    network: NETWORK_LABELS[coin],
    address,
    envKey: found.envKey,
    memoHint: coin === 'GRAM' || coin === 'TON' ? 'deposit_{userId}' : undefined,
  };
}

export function resolveAllMasterAddresses(): ResolvedMasterAddress[] {
  const order: DepositCoinKey[] = ['GRAM', 'ETH', 'SOL', 'USDT', 'TRX', 'BTC'];
  const seen = new Set<string>();
  const result: ResolvedMasterAddress[] = [];

  for (const coin of order) {
    const resolved = resolveMasterAddress(coin);
    if (!resolved || seen.has(resolved.address)) continue;
    seen.add(resolved.address);
    result.push(resolved);
  }

  return result;
}

/** Memo / comment для идентификации депозита пользователя */
export function buildDepositMemo(userId: string, rawCoin: string): string | undefined {
  const coin = normalizeDepositCoin(rawCoin);
  if (!coin) return undefined;
  if (coin === 'GRAM' || coin === 'TON') {
    return `deposit_${userId}`;
  }
  if (coin === 'TRX' || coin === 'USDT') {
    return `pidr_${userId}`;
  }
  if (coin === 'SOL' || coin === 'ETH') {
    return `deposit_${userId}`;
  }
  return undefined;
}

export function mapCoinToUnifiedNetwork(coin: string): string | null {
  const normalized = normalizeDepositCoin(coin);
  if (!normalized) return null;
  const map: Record<DepositCoinKey, string> = {
    GRAM: 'TON',
    TON: 'TON',
    ETH: 'ETH',
    SOL: 'SOL',
    USDT: 'USDT_TRC20',
    TRX: 'TRX',
    BTC: 'BTC',
  };
  return map[normalized];
}
