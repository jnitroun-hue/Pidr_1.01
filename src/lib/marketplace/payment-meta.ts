import { GRAM } from '@/lib/crypto/gram-brand';
import { CRYPTO_TOKENS } from '@/lib/crypto/crypto-assets';

export type SellCategory = 'coins' | 'crypto' | 'fiat';
/** GRAM = нативный токен TON (legacy API: TON) */
export type SellCrypto = 'GRAM' | 'SOL' | 'TRX' | 'ETH' | 'USDT';
export type ListingCryptoCode = 'TON' | 'SOL' | 'ETH' | 'TRX' | 'USDT';
export type FiatMethod = 'bank_card' | 'sbp' | 'yoo_money' | 'sberbank';
export type FiatReceiveMode = 'phone' | 'qr';

export const CRYPTO_OPTIONS: {
  id: SellCrypto;
  label: string;
  icon: string;
  color: string;
  network: string;
  placeholder: string;
}[] = [
  { id: 'GRAM', label: 'Gram', icon: CRYPTO_TOKENS.GRAM.icon, color: CRYPTO_TOKENS.GRAM.color, network: 'TON', placeholder: 'UQ... или EQ...' },
  { id: 'SOL', label: 'SOL', icon: CRYPTO_TOKENS.SOL.icon, color: CRYPTO_TOKENS.SOL.color, network: 'Solana', placeholder: 'Адрес Solana' },
  { id: 'TRX', label: 'TRX', icon: CRYPTO_TOKENS.TRX.icon, color: CRYPTO_TOKENS.TRX.color, network: 'TRON', placeholder: 'Адрес TRON (T...)' },
  { id: 'ETH', label: 'ETH', icon: CRYPTO_TOKENS.ETH.icon, color: CRYPTO_TOKENS.ETH.color, network: 'Ethereum', placeholder: '0x...' },
  { id: 'USDT', label: 'USDT', icon: CRYPTO_TOKENS.USDT.icon, color: CRYPTO_TOKENS.USDT.color, network: 'TRC-20 / ERC-20', placeholder: 'T... или 0x...' },
];

export const FIAT_OPTIONS: {
  id: FiatMethod;
  label: string;
  short: string;
  color: string;
  bg: string;
}[] = [
  { id: 'sbp', label: 'СБП', short: 'СБП', color: '#4ade80', bg: 'rgba(34,197,94,0.15)' },
  { id: 'bank_card', label: 'Банковская карта', short: 'Карта', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  { id: 'sberbank', label: 'SberPay', short: 'Sber', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'yoo_money', label: 'ЮMoney', short: 'ЮMoney', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
];

export function fiatMethodLabel(method?: string | null): string {
  return FIAT_OPTIONS.find((f) => f.id === method)?.label ?? 'Рубли';
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return raw.trim();
}

export function isValidPhone(raw: string): boolean {
  const n = normalizePhone(raw).replace(/\D/g, '');
  return n.length >= 10 && n.length <= 15;
}

function isEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isTronAddress(address: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}

export function sellCryptoCode(crypto: SellCrypto): ListingCryptoCode {
  return crypto === 'GRAM' ? 'TON' : crypto;
}

export function isValidWallet(network: SellCrypto, address: string): boolean {
  const a = address.trim();
  if (network === 'GRAM') return a.length >= 24;
  if (network === 'SOL') return a.length >= 32 && a.length <= 48;
  if (network === 'ETH') return isEthAddress(a);
  if (network === 'TRX') return isTronAddress(a);
  if (network === 'USDT') return isEthAddress(a) || isTronAddress(a);
  return a.length >= 16;
}

export interface ListingCryptoOffer {
  code: ListingCryptoCode;
  symbol: string;
  amount: number;
  icon: string;
  color: string;
}

export function resolveListingCrypto(listing: {
  price_ton?: number | null;
  price_sol?: number | null;
  crypto_currency?: string | null;
  seller_wallet_network?: string | null;
} | null | undefined): ListingCryptoOffer | null {
  if (!listing) return null;
  const explicit = String(listing.crypto_currency || listing.seller_wallet_network || '').toUpperCase();
  const ton = Number(listing.price_ton || 0);
  const sol = Number(listing.price_sol || 0);
  const code: ListingCryptoCode | null =
    explicit === 'ETH' || explicit === 'TRX' || explicit === 'USDT' || explicit === 'SOL'
      ? explicit
      : explicit === 'TON' || explicit === 'GRAM'
        ? 'TON'
        : ton > 0
          ? 'TON'
          : sol > 0
            ? 'SOL'
            : null;
  if (!code) return null;
  const amount = code === 'TON' ? ton : sol || ton;
  if (!(amount > 0)) return null;
  const token = code === 'TON' ? CRYPTO_TOKENS.GRAM : CRYPTO_TOKENS[code];
  return {
    code,
    symbol: token.symbol,
    amount,
    icon: token.icon,
    color: token.color,
  };
}
