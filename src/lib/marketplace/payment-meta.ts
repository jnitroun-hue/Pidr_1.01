import { GRAM } from '@/lib/crypto/gram-brand';

export type SellCategory = 'coins' | 'crypto' | 'fiat';
/** GRAM = нативный токен TON (legacy API: TON) */
export type SellCrypto = 'GRAM' | 'SOL';
export type FiatMethod = 'bank_card' | 'sbp' | 'yoo_money' | 'sberbank';
export type FiatReceiveMode = 'phone' | 'qr';

export const CRYPTO_OPTIONS: { id: SellCrypto; label: string; icon: string; color: string }[] = [
  { id: 'GRAM', label: GRAM.name, icon: GRAM.icon, color: GRAM.color },
  { id: 'SOL', label: 'Solana', icon: '/img/solana-icon.svg', color: '#9945ff' },
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

export function isValidWallet(network: SellCrypto, address: string): boolean {
  const a = address.trim();
  if (network === 'GRAM') return a.length >= 24;
  if (network === 'SOL') return a.length >= 32 && a.length <= 48;
  return a.length >= 16;
}
