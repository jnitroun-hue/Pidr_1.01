import { GRAM } from './gram-brand';

export interface CryptoTokenMeta {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  /** Legacy id в API / env */
  apiKey: string;
}

export interface WalletAppMeta {
  id: string;
  label: string;
  icon: string;
  accent: string;
  network: 'ton' | 'eth' | 'sol';
}

const gramToken: CryptoTokenMeta = {
  symbol: GRAM.symbol,
  name: GRAM.name,
  icon: GRAM.icon,
  color: GRAM.color,
  apiKey: 'TON',
};

export const CRYPTO_TOKENS = {
  GRAM: gramToken,
  TON: gramToken,
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '/img/btc-icon.svg',
    color: '#F7931A',
    apiKey: 'BTC',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: '/img/eth-icon.svg',
    color: '#627EEA',
    apiKey: 'ETH',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    icon: '/img/sol-icon.svg',
    color: '#9945FF',
    apiKey: 'SOL',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    icon: '/img/usdt-icon.svg',
    color: '#26A17B',
    apiKey: 'USDT',
  },
  JETTON: {
    symbol: 'JETTON',
    name: 'Jetton',
    icon: '/img/jetton-icon.svg',
    color: '#0098EA',
    apiKey: 'JETTON',
  },
} as const satisfies Record<string, CryptoTokenMeta>;

export type CryptoApiKey = keyof typeof CRYPTO_TOKENS | 'TON';

export function getCryptoToken(symbol: string | null | undefined): CryptoTokenMeta {
  if (!symbol) return CRYPTO_TOKENS.GRAM;
  const key = symbol.toUpperCase();
  if (key === 'TON' || key === 'GRAM') return CRYPTO_TOKENS.GRAM;
  return (CRYPTO_TOKENS as Record<string, CryptoTokenMeta>)[key] ?? CRYPTO_TOKENS.GRAM;
}

export function cryptoIconPath(symbol: string | null | undefined): string {
  return getCryptoToken(symbol).icon;
}

export function cryptoDisplaySymbol(symbol: string | null | undefined): string {
  return getCryptoToken(symbol).symbol;
}

export function cryptoDisplayName(symbol: string | null | undefined): string {
  return getCryptoToken(symbol).name;
}

/** Кошельки для Quick Connect */
export const WALLET_APPS: Record<string, WalletAppMeta> = {
  'telegram-wallet': {
    id: 'telegram-wallet',
    label: GRAM.walletLabel,
    icon: '/img/telegram-wallet-icon.svg',
    accent: '#26A5E4',
    network: 'ton',
  },
  tonkeeper: {
    id: 'tonkeeper',
    label: 'Tonkeeper',
    icon: '/img/tonkeeper-icon.svg',
    accent: '#0098EA',
    network: 'ton',
  },
  metamask: {
    id: 'metamask',
    label: 'MetaMask',
    icon: '/img/metamask-icon.svg',
    accent: '#E2761B',
    network: 'eth',
  },
  trust: {
    id: 'trust',
    label: 'Trust Wallet',
    icon: '/img/trust-wallet-icon.svg',
    accent: '#3375BB',
    network: 'eth',
  },
  phantom: {
    id: 'phantom',
    label: 'Phantom',
    icon: '/img/phantom-icon.svg',
    accent: '#AB9FF2',
    network: 'sol',
  },
};

/** Порядок для депозита в GameWallet */
export const DEPOSIT_CRYPTO_ORDER = ['TON', 'ETH', 'SOL', 'USDT', 'BTC'] as const;

export function depositCryptoOptions() {
  return DEPOSIT_CRYPTO_ORDER.map((apiKey) => {
    const token = getCryptoToken(apiKey);
    return {
      id: token.apiKey,
      icon: token.icon,
      name: token.symbol,
      color: token.color,
      net:
        apiKey === 'TON'
          ? GRAM.networkLabel
          : apiKey === 'ETH'
            ? 'Ethereum (ERC-20)'
            : apiKey === 'SOL'
              ? 'Solana (SPL)'
              : apiKey === 'USDT'
                ? 'Tether (USDT)'
                : 'Bitcoin',
      eta:
        apiKey === 'TON'
          ? '~5 сек'
          : apiKey === 'SOL'
            ? '~30 сек'
            : apiKey === 'BTC'
              ? '10-60 мин'
              : '2-15 мин',
    };
  });
}
