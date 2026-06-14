import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeReferralCode } from './referral-links';

export interface ResolvedReferrer {
  id: number;
  username?: string | null;
  telegram_id?: string | null;
}

/** Найти пригласившего по id БД, referral_code, telegram_id или vk_id */
export async function resolveReferrerByCode(
  supabase: SupabaseClient,
  rawCode: string
): Promise<ResolvedReferrer | null> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;

  const numeric = Number(code);
  if (!Number.isNaN(numeric) && numeric > 0) {
    const { data } = await supabase
      .from('_pidr_users')
      .select('id, username, telegram_id')
      .eq('id', numeric)
      .maybeSingle();
    if (data) return data;
  }

  const { data: byReferralCode } = await supabase
    .from('_pidr_users')
    .select('id, username, telegram_id')
    .eq('referral_code', code)
    .maybeSingle();
  if (byReferralCode) return byReferralCode;

  const { data: byTelegram } = await supabase
    .from('_pidr_users')
    .select('id, username, telegram_id')
    .eq('telegram_id', code)
    .maybeSingle();
  if (byTelegram) return byTelegram;

  const { data: byVk } = await supabase
    .from('_pidr_users')
    .select('id, username, telegram_id')
    .eq('vk_id', code)
    .maybeSingle();
  if (byVk) return byVk;

  return null;
}
