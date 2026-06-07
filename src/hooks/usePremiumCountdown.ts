'use client';

import { useEffect, useState } from 'react';
import { getPremiumCountdown, type PremiumCountdown } from '@/lib/premium/countdown';

export function usePremiumCountdown(
  expiresAt: string | null | undefined,
  startedAt?: string | null
): PremiumCountdown {
  const [countdown, setCountdown] = useState(() =>
    getPremiumCountdown(expiresAt ?? null, startedAt)
  );

  useEffect(() => {
    const tick = () => setCountdown(getPremiumCountdown(expiresAt ?? null, startedAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, startedAt]);

  return countdown;
}
