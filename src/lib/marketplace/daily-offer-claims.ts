import { getSupabaseAdmin } from '@/lib/supabase';
import { getRedis } from '@/lib/redis/client';

export const DAILY_OFFER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CLAIM_TYPE = 'daily_offer_claim';

export async function getDailyOfferClaimState(userId: number): Promise<{
  claimedAt: number | null;
  remainingMs: number;
  canClaim: boolean;
}> {
  const now = Date.now();

  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(`marketplace:daily-offer:claim:${userId}`);
      if (raw) {
        const claimedAt = Number(raw);
        const remainingMs = Math.max(0, claimedAt + DAILY_OFFER_COOLDOWN_MS - now);
        return { claimedAt, remainingMs, canClaim: remainingMs <= 0 };
      }
    } catch (e) {
      console.warn('⚠️ [daily-offer] Redis read failed, fallback to DB:', e);
    }
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return { claimedAt: null, remainingMs: 0, canClaim: true };
  }

  const since = new Date(now - DAILY_OFFER_COOLDOWN_MS).toISOString();
  const { data } = await db
    .from('_pidr_coin_transactions')
    .select('created_at')
    .eq('user_id', userId)
    .eq('transaction_type', CLAIM_TYPE)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.created_at) {
    const claimedAt = new Date(data.created_at).getTime();
    const remainingMs = Math.max(0, claimedAt + DAILY_OFFER_COOLDOWN_MS - now);
    return { claimedAt, remainingMs, canClaim: remainingMs <= 0 };
  }

  return { claimedAt: null, remainingMs: 0, canClaim: true };
}

export async function recordDailyOfferClaim(
  userId: number,
  meta?: { listingId?: number; coinsPaid?: number; balanceAfter?: number }
): Promise<void> {
  const now = Date.now();
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`marketplace:daily-offer:claim:${userId}`, String(now), {
        ex: Math.ceil(DAILY_OFFER_COOLDOWN_MS / 1000),
      });
    } catch (e) {
      console.warn('⚠️ [daily-offer] Redis write failed:', e);
    }
  }

  const db = getSupabaseAdmin();
  if (!db) return;

  const { data: user } = await db.from('_pidr_users').select('coins').eq('id', userId).maybeSingle();
  const balance = user?.coins ?? meta?.balanceAfter ?? 0;

  await db.from('_pidr_coin_transactions').insert({
    user_id: userId,
    amount: meta?.coinsPaid ? -Math.abs(meta.coinsPaid) : 0,
    transaction_type: CLAIM_TYPE,
    description: meta?.coinsPaid
      ? meta.listingId
        ? `Акция дня — покупка лота #${meta.listingId}`
        : `Premium акция дня — ${meta.coinsPaid.toLocaleString('ru-RU')} монет`
      : 'Акция дня — активация',
    balance_before: balance + (meta?.coinsPaid || 0),
    balance_after: meta?.balanceAfter ?? balance,
  });
}
