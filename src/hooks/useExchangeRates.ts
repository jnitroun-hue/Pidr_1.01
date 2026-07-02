'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ExchangeRateSnapshot } from '@/lib/pricing/types';

type RatesResponse = ExchangeRateSnapshot & {
  success?: boolean;
  yookassaEnabled?: boolean;
  nextRefreshHint?: string;
};

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRateSnapshot | null>(null);
  const [yookassaEnabled, setYookassaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wallet/rates?t=${Date.now()}`, { cache: 'no-store' });
      const data = (await res.json()) as RatesResponse;
      if (!res.ok || !data.updatedAt) {
        throw new Error('Не удалось загрузить курсы');
      }
      setRates(data);
      setYookassaEnabled(Boolean(data.yookassaEnabled));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка курсов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rates, yookassaEnabled, loading, error, reload };
}
