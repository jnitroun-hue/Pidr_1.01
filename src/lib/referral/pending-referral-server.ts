import type { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyReferralForNewUser, type ApplyReferralResult } from './apply-referral';
import { PENDING_REFERRAL_COOKIE, type ReferralAuthMethod } from './constants';
import { normalizeReferralCode } from './referral-links';

export function getPendingReferralFromRequest(
  request: NextRequest,
  bodyReferralCode?: string | null
): string | null {
  const fromCookie = request.cookies.get(PENDING_REFERRAL_COOKIE)?.value;
  const fromBody = bodyReferralCode ? String(bodyReferralCode) : null;
  return normalizeReferralCode(fromCookie || fromBody);
}

/** Применить реферал для нового пользователя (любой способ входа). */
export async function applyPendingReferralForNewUser(
  request: NextRequest,
  supabase: SupabaseClient,
  params: {
    referredUserId: number;
    authMethod: ReferralAuthMethod;
    isNewUser: boolean;
    explicitReferralCode?: string | null;
    grantBonuses?: boolean;
  }
): Promise<ApplyReferralResult | null> {
  if (!params.isNewUser) return null;

  const code =
    normalizeReferralCode(params.explicitReferralCode) ||
    getPendingReferralFromRequest(request);

  if (!code) return null;

  const result = await applyReferralForNewUser(supabase, {
    referredUserId: params.referredUserId,
    referralCode: code,
    authMethod: params.authMethod,
    grantBonuses: params.grantBonuses ?? false,
  });

  console.log(`🎁 [referral] apply (${params.authMethod}):`, { code, ...result });
  return result;
}

export function clearPendingReferralCookie(response: NextResponse): void {
  response.cookies.set(PENDING_REFERRAL_COOKIE, '', {
    path: '/',
    maxAge: 0,
  });
}
