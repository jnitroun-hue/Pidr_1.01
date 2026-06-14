'use client';

import { useEffect, useState } from 'react';
import { getTargetCountdown, type PremiumCountdown } from '@/lib/premium/countdown';

export function useFreeRollCountdown(targetAt: string | null | undefined): PremiumCountdown {
  const [countdown, setCountdown] = useState(() => getTargetCountdown(targetAt ?? null));

  useEffect(() => {
    const tick = () => setCountdown(getTargetCountdown(targetAt ?? null));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetAt]);

  return countdown;
}
