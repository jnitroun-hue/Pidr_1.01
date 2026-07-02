'use client';

import { clearPendingReferralCookie, getPendingReferralFromClient } from './pending-referral-client';
import type { ReferralAuthMethod } from './constants';

/** После успешной авторизации — применить сохранённый реф-код (fallback, если сервер не применил). */
export async function applyPendingReferralAfterAuth(
  authMethod: ReferralAuthMethod
): Promise<boolean> {
  const code = getPendingReferralFromClient();
  if (!code) return false;

  try {
    const response = await fetch('/api/referral/apply', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: code, authMethod }),
    });

    if (response.ok) {
      clearPendingReferralCookie();
      return true;
    }
  } catch (error) {
    console.warn('⚠️ [referral] client apply failed:', error);
  }

  return false;
}
