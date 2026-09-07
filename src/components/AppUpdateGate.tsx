'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import {
  APP_UPDATE_GATE_MAX_WAIT_MS,
  APP_VERSION_CHECK_INTERVAL_MS,
} from '@/lib/app-version/constants';
import { ensureLatestAppVersion } from '@/lib/app-version/check-app-update';
import { isTelegramMiniAppClient } from '@/lib/telegram/init-mini-app';
import { isVKMiniApp } from '@/lib/auth/vk-bridge';

type Props = {
  children: ReactNode;
};

function isMiniAppClient(): boolean {
  return isTelegramMiniAppClient() || isVKMiniApp();
}

/**
 * Принудительное обновление кэша только в Telegram / VK Mini App:
 * клиент там долго держит старый JS. В браузере обычного обновления страницы достаточно.
 */
export default function AppUpdateGate({ children }: Props) {
  const pathname = usePathname();
  const [runGate, setRunGate] = useState(false);
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isMiniAppClient()) {
      return;
    }

    setRunGate(true);

    let cancelled = false;
    const failOpen = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, APP_UPDATE_GATE_MAX_WAIT_MS);

    const runCheck = async () => {
      const result = await ensureLatestAppVersion();
      if (cancelled) return;

      if (result === 'reloading') {
        setUpdating(true);
        return;
      }

      setUpdating(false);
      setReady(true);
    };

    void runCheck();

    return () => {
      cancelled = true;
      window.clearTimeout(failOpen);
    };
  }, []);

  useEffect(() => {
    if (!runGate || !ready) return;

    let cancelled = false;
    void (async () => {
      const result = await ensureLatestAppVersion();
      if (cancelled || result !== 'reloading') return;
      setUpdating(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, ready, runGate]);

  useEffect(() => {
    if (!runGate || !ready) return;

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

    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.onEvent === 'function') {
      tg.onEvent('activated', tick);
    }

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [ready, runGate]);

  if (!runGate) {
    return <>{children}</>;
  }

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
