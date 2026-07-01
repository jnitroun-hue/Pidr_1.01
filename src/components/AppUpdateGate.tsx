'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import { APP_VERSION_CHECK_INTERVAL_MS } from '@/lib/app-version/constants';
import { ensureLatestAppVersion } from '@/lib/app-version/check-app-update';

type Props = {
  children: ReactNode;
};

/**
 * При входе и при смене страницы проверяет build id на сервере.
 * Если деплой новее — принудительно обновляет (как в онлайн-играх).
 */
export default function AppUpdateGate({ children }: Props) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async (isInitial: boolean) => {
      if (isInitial) setReady(false);
      else setUpdating(true);

      const result = await ensureLatestAppVersion();
      if (cancelled) return;

      if (result === 'reloading') {
        setUpdating(true);
        return;
      }

      setUpdating(false);
      setReady(true);
    };

    void runCheck(true);

    return () => {
      cancelled = true;
    };
  }, []);

  // При навигации внутри SPA — лёгкая проверка (новый деплой без перезапуска Mini App)
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    void (async () => {
      const result = await ensureLatestAppVersion();
      if (cancelled || result !== 'reloading') return;
      setUpdating(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, ready]);

  // Периодически + при возврате в Telegram / вкладку
  useEffect(() => {
    if (!ready) return;

    const tick = () => {
      void ensureLatestAppVersion().then((result) => {
        if (result === 'reloading') setUpdating(true);
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };

    const intervalId = window.setInterval(tick, APP_VERSION_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [ready]);

  if (!ready || updating) {
    return (
      <PageLoadingScreen
        title="P.I.D.R."
        subtitle={updating ? 'Обновление до новой версии…' : 'Проверка обновлений…'}
      />
    );
  }

  return <>{children}</>;
}
