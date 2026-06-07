import { supabaseAdmin } from '@/lib/supabase';
import { getPayoutWeekKey } from '@/lib/rating/weekly-prizes';
import { PREMIUM_DURATION_DAYS } from './constants';

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: string | null;
  startedAt: string | null;
  daysLeft: number;
  freeRandomAvailable: boolean;
  weekKey: string;
  canPurchase: boolean;
}

export function getPremiumDiscountPercent(rarityOrRank: string): number {
  const key = rarityOrRank.toLowerCase();
  const rarityMap: Record<string, number> = {
    common: 20,
    rare: 25,
    epic: 30,
    legendary: 35,
    '2': 20, '3': 20, '4': 20, '5': 20, '6': 20, '7': 20, '8': 20, '9': 20,
    '10': 25, jack: 25, j: 25,
    queen: 30, q: 30,
    king: 35, k: 35,
    ace: 35, a: 35,
  };
  return rarityMap[key] ?? 20;
}

export function applyPremiumDiscount(baseCost: number, discountPercent: number): number {
  return Math.max(0, Math.floor(baseCost * (1 - discountPercent / 100)));
}

export function isPremiumActiveFromUser(user: {
  is_premium?: boolean | null;
  premium_expires_at?: string | null;
}): boolean {
  if (!user.premium_expires_at) return false;
  return new Date(user.premium_expires_at).getTime() > Date.now();
}

export async function syncPremiumFlag(userId: number): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('_pidr_users')
    .select('premium_expires_at')
    .eq('id', userId)
    .single();

  const active = user?.premium_expires_at
    ? new Date(user.premium_expires_at).getTime() > Date.now()
    : false;

  await supabaseAdmin
    .from('_pidr_users')
    .update({ is_premium: active })
    .eq('id', userId);

  return active;
}

export async function getPremiumStatus(userId: number): Promise<PremiumStatus> {
  await syncPremiumFlag(userId);

  const { data: user } = await supabaseAdmin
    .from('_pidr_users')
    .select('is_premium, premium_expires_at')
    .eq('id', userId)
    .single();

  const weekKey = getPayoutWeekKey();

  const { data: freeGen } = await supabaseAdmin
    .from('_pidr_premium_free_generations')
    .select('id')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
    .maybeSingle();

  const expiresAt = user?.premium_expires_at ?? null;
  const isPremium = isPremiumActiveFromUser({ premium_expires_at: expiresAt });
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  let startedAt: string | null = null;
  if (isPremium) {
    const { data: sub } = await supabaseAdmin
      .from('_pidr_premium_subscriptions')
      .select('started_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    startedAt = sub?.started_at ?? null;
  }

  return {
    isPremium,
    expiresAt,
    startedAt,
    daysLeft,
    freeRandomAvailable: isPremium && !freeGen,
    weekKey,
    canPurchase: !isPremium,
  };
}

/** Покупка разрешена только если Premium не активен (1 раз в месяц, без продления) */
export async function assertCanPurchasePremium(userId: number): Promise<void> {
  const status = await getPremiumStatus(userId);
  if (status.isPremium) {
    const until = status.expiresAt
      ? new Date(status.expiresAt).toLocaleString('ru-RU')
      : '—';
    throw new Error(`Premium уже активен до ${until}. Повторная покупка возможна после окончания срока.`);
  }
}

export async function activatePremium(params: {
  userId: number;
  source: 'coins' | 'yookassa' | 'admin';
  paymentId?: string;
  amountPaidRub?: number;
  amountPaidCoins?: number;
  allowExtend?: boolean;
}): Promise<{ expiresAt: string }> {
  const { userId, source, paymentId, amountPaidRub, amountPaidCoins, allowExtend = false } = params;

  if (!allowExtend) {
    await assertCanPurchasePremium(userId);
  }

  const { data: user } = await supabaseAdmin
    .from('_pidr_users')
    .select('premium_expires_at')
    .eq('id', userId)
    .single();

  const now = Date.now();
  const startedAt = new Date().toISOString();
  let expiresAt: string;

  if (allowExtend && user?.premium_expires_at && new Date(user.premium_expires_at).getTime() > now) {
    expiresAt = new Date(new Date(user.premium_expires_at).getTime() + PREMIUM_DURATION_DAYS * 86400000).toISOString();
  } else {
    expiresAt = new Date(now + PREMIUM_DURATION_DAYS * 86400000).toISOString();
  }

  await supabaseAdmin
    .from('_pidr_users')
    .update({ is_premium: true, premium_expires_at: expiresAt })
    .eq('id', userId);

  await supabaseAdmin
    .from('_pidr_premium_subscriptions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  await supabaseAdmin.from('_pidr_premium_subscriptions').insert({
    user_id: userId,
    started_at: startedAt,
    expires_at: expiresAt,
    source,
    amount_paid_rub: amountPaidRub ?? null,
    amount_paid_coins: amountPaidCoins ?? null,
    payment_id: paymentId ?? null,
    is_active: true,
  });

  return { expiresAt };
}

export async function consumeFreeRandomGeneration(userId: number, nftId?: number): Promise<boolean> {
  const status = await getPremiumStatus(userId);
  if (!status.freeRandomAvailable) return false;

  const { error } = await supabaseAdmin.from('_pidr_premium_free_generations').insert({
    user_id: userId,
    week_key: status.weekKey,
    nft_id: nftId ?? null,
  });

  return !error;
}
