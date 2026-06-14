import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeReferralCode } from './referral-links';
import { resolveReferrerByCode } from './resolve-referrer';
import type { ReferralAuthMethod } from './constants';

export interface ApplyReferralParams {
  referredUserId: number;
  referralCode: string;
  authMethod: ReferralAuthMethod;
  /** Бонусы включим позже — пока только учёт в БД */
  grantBonuses?: boolean;
}

export interface ApplyReferralResult {
  success: boolean;
  error?: string;
  alreadyLinked?: boolean;
  referrerId?: number;
  skipped?: boolean;
}

/**
 * Привязать нового пользователя к рефереру (любой способ входа).
 * Сохраняет referred_by_user_id + referred_auth_method + запись в _pidr_referrals.
 */
export async function applyReferralForNewUser(
  supabase: SupabaseClient,
  params: ApplyReferralParams
): Promise<ApplyReferralResult> {
  const code = normalizeReferralCode(params.referralCode);
  if (!code) {
    return { success: false, error: 'Invalid referral code' };
  }

  const referredUserId = params.referredUserId;

  const { data: referredUser, error: referredErr } = await supabase
    .from('_pidr_users')
    .select('id, referred_by_user_id')
    .eq('id', referredUserId)
    .maybeSingle();

  if (referredErr || !referredUser) {
    return { success: false, error: 'Referred user not found' };
  }

  if (referredUser.referred_by_user_id) {
    return { success: true, alreadyLinked: true, referrerId: referredUser.referred_by_user_id };
  }

  const referrer = await resolveReferrerByCode(supabase, code);
  if (!referrer) {
    return { success: false, error: 'Referrer not found' };
  }

  if (referrer.id === referredUserId) {
    return { success: false, error: 'Cannot use your own referral link' };
  }

  // RPC (если есть в Supabase) — приоритет
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('process_referral', {
      p_referred_id: referredUserId,
      p_referral_code: code,
    });

    if (!rpcError && rpcData?.success) {
      await patchReferredUserMeta(supabase, referredUserId, referrer.id, params.authMethod, code);
      if (params.grantBonuses) {
        await tryGrantBonuses(referrer.id, referredUserId);
      }
      return { success: true, referrerId: referrer.id };
    }
  } catch {
    // fallback ниже
  }

  const { error: insertErr } = await supabase.from('_pidr_referrals').insert({
    referrer_user_id: referrer.id,
    referred_user_id: referredUserId,
    referred_auth_method: params.authMethod,
    referral_code_used: code,
    created_at: new Date().toISOString(),
  });

  if (insertErr && !isDuplicateReferralError(insertErr)) {
    console.warn('⚠️ [referral] insert _pidr_referrals:', insertErr.message);
  }

  await patchReferredUserMeta(supabase, referredUserId, referrer.id, params.authMethod, code);

  if (params.grantBonuses) {
    await tryGrantBonuses(referrer.id, referredUserId);
  }

  return { success: true, referrerId: referrer.id };
}

async function patchReferredUserMeta(
  supabase: SupabaseClient,
  referredUserId: number,
  referrerId: number,
  authMethod: ReferralAuthMethod,
  code: string
) {
  const { error } = await supabase
    .from('_pidr_users')
    .update({
      referred_by_user_id: referrerId,
      referred_auth_method: authMethod,
      referral_source_code: code,
      updated_at: new Date().toISOString(),
    })
    .eq('id', referredUserId)
    .is('referred_by_user_id', null);

  if (error) {
    console.warn('⚠️ [referral] patch user meta (run migration 0011?):', error.message);
  }
}

function isDuplicateReferralError(error: { code?: string; message?: string }) {
  return error.code === '23505' || (error.message || '').includes('duplicate');
}

async function tryGrantBonuses(referrerId: number, newUserId: number) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    await fetch(`${base}/api/referral/bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer_id: String(referrerId),
        new_user_id: String(newUserId),
      }),
    });
  } catch (e) {
    console.warn('⚠️ [referral] bonus grant deferred:', e);
  }
}

/** Маппинг окружения авторизации → метод для статистики */
export function authEnvironmentToReferralMethod(
  environment: string | undefined
): ReferralAuthMethod {
  switch (environment) {
    case 'telegram':
      return 'telegram';
    case 'vk':
      return 'vk';
    case 'web':
      return 'web';
    default:
      return 'unknown';
  }
}
