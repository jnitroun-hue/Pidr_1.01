import { GRAM } from './gram-brand';

export interface CryptoTokenMeta {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  /** Legacy id в API / env */
  apiKey: string;
}

export type DepositCapability = {
  network: string;
  eta: string;
  walletPay: boolean;
  tonConnect: boolean;
  externalWallet?: 'tronlink' | 'phantom' | 'metamask' | 'bitcoin';
  verifiedCredit: boolean;
  availability: 'available' | 'address-only' | 'unavailable';
  warning?: string;
};

export interface WalletAppMeta {
  id: string;
  label: string;
  icon: string;
  accent: string;
  network: 'ton' | 'eth' | 'sol' | 'tron';
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
  TRX: {
    symbol: 'TRX',
    name: 'Tron',
    icon: '/img/trx-icon.svg',
    color: '#EF0027',
    apiKey: 'TRX',
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '/img/btc-icon.svg',
    color: '#F7931A',
    apiKey: 'BTC',
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
  tronlink: {
    id: 'tronlink',
    label: 'TronLink',
    icon: '/img/trx-icon.svg',
    accent: '#EF0027',
    network: 'tron',
  },
};

/** Порядок как в Telegram Wallet → «Популярные» */
export const DEPOSIT_CRYPTO_ORDER = ['USDT', 'ETH', 'BTC', 'TON', 'TRX', 'SOL'] as const;

export const DEPOSIT_CAPABILITIES: Record<(typeof DEPOSIT_CRYPTO_ORDER)[number], DepositCapability> = {
  TON: {
    network: GRAM.networkLabel,
    eta: '~5–30 сек',
    walletPay: true,
    tonConnect: true,
    verifiedCredit: true,
    availability: 'available',
  },
  USDT: {
    network: 'Tron (TRC-20)',
    eta: '~1–3 мин',
    walletPay: true,
    tonConnect: false,
    externalWallet: 'tronlink',
    verifiedCredit: true,
    availability: 'available',
  },
  BTC: {
    network: 'Bitcoin',
    eta: '10–60 мин',
    walletPay: true,
    tonConnect: false,
    externalWallet: 'bitcoin',
    verifiedCredit: true,
    availability: 'available',
  },
  ETH: {
    network: 'Ethereum',
    eta: '2–15 мин',
    walletPay: false,
    tonConnect: false,
    externalWallet: 'metamask',
    verifiedCredit: false,
    availability: 'address-only',
    warning: 'Автоматическая проверка Ethereum-переводов пока не включена. Не отправляйте средства без подтверждения поддержки.',
  },
  TRX: {
    network: 'Tron (native TRX)',
    eta: '~1–3 мин',
    walletPay: false,
    tonConnect: false,
    externalWallet: 'tronlink',
    verifiedCredit: false,
    availability: 'address-only',
    warning: 'TON Connect и Telegram Wallet не отправляют native TRX. Доступен только адрес Tron/TronLink; автоматическое зачисление TRX пока выключено.',
  },
  SOL: {
    network: 'Solana (native SOL)',
    eta: '~30 сек',
    walletPay: false,
    tonConnect: false,
    externalWallet: 'phantom',
    verifiedCredit: false,
    availability: 'address-only',
    warning: 'TON Connect и Telegram Wallet не отправляют native SOL. Доступен только адрес Solana/Phantom; автоматическое зачисление SOL пока выключено.',
  },
};

export function depositCryptoOptions() {
  return DEPOSIT_CRYPTO_ORDER.map((apiKey) => {
    const token = getCryptoToken(apiKey);
    const capability = DEPOSIT_CAPABILITIES[apiKey];
    return {
      id: token.apiKey,
      icon: token.icon,
      name: token.symbol,
      color: token.color,
      net: capability.network,
      eta: capability.eta,
      telegramWallet: capability.walletPay || capability.tonConnect,
      capability,
    };
  });
}
