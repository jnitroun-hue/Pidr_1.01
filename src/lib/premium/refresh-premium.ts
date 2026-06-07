import { getApiHeaders } from '@/lib/api-headers';
import type { PremiumStatus } from '@/lib/premium/premium-service';

/** Загрузить актуальный Premium с сервера (real-time, без кэша). */
export async function fetchPremiumStatus(): Promise<PremiumStatus | null> {
  try {
    const res = await fetch('/api/premium/status', {
      credentials: 'include',
      headers: getApiHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? (data.premium as PremiumStatus) : null;
  } catch {
    return null;
  }
}

export function isPremiumUsable(premium: PremiumStatus | null | undefined): premium is PremiumStatus {
  return Boolean(
    premium?.isPremium &&
    premium.expiresAt &&
    new Date(premium.expiresAt).getTime() > Date.now()
  );
}
