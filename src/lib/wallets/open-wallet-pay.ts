/**
 * Открыть экран оплаты Telegram Wallet (как Jetton — одно подтверждение).
 * Важно: только openTelegramLink, не openLink.
 */
export function openWalletPayLink(payLink: string): void {
  if (typeof window === 'undefined') return;

  const tg = (window as Window & { Telegram?: { WebApp?: {
    openTelegramLink?: (url: string) => void;
    openLink?: (url: string) => void;
  } } }).Telegram?.WebApp;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(payLink);
    return;
  }

  if (tg?.openLink) {
    tg.openLink(payLink);
    return;
  }

  window.open(payLink, '_blank');
}

export function isInsideTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' &&
    Boolean((window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: unknown } } } })
      .Telegram?.WebApp?.initDataUnsafe?.user);
}
