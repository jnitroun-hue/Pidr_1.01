'use client';

import { PENDING_REFERRAL_COOKIE, REFERRAL_QUERY_PARAM } from './constants';
import { normalizeReferralCode } from './referral-links';

export function setPendingReferralCookie(code: string) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  const maxAge = 30 * 24 * 60 * 60;
  document.cookie = `${PENDING_REFERRAL_COOKIE}=${encodeURIComponent(normalized)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  try {
    localStorage.setItem(PENDING_REFERRAL_COOKIE, normalized);
  } catch {
    /* ignore */
  }
}

export function clearPendingReferralCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${PENDING_REFERRAL_COOKIE}=; path=/; max-age=0`;
  try {
    localStorage.removeItem(PENDING_REFERRAL_COOKIE);
  } catch {
    /* ignore */
  }
}

export function getPendingReferralFromClient(): string | null {
  if (typeof document === 'undefined') return null;
  const fromCookie = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PENDING_REFERRAL_COOKIE}=`));
  if (fromCookie) {
    return decodeURIComponent(fromCookie.split('=').slice(1).join('='));
  }
  try {
    return localStorage.getItem(PENDING_REFERRAL_COOKIE);
  } catch {
    return null;
  }
}

/** Считать ?ref= из текущего URL и сохранить */
export function captureReferralFromCurrentUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get(REFERRAL_QUERY_PARAM) || params.get('invite');
  if (!ref) return null;
  const normalized = normalizeReferralCode(ref);
  if (!normalized) return null;
  setPendingReferralCookie(normalized);
  return normalized;
}
