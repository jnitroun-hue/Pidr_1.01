/** Клиентский признак сессии: httpOnly JWT сам по себе в document.cookie не виден. */
export function hasAuthTokenCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => {
    const trimmed = part.trim();
    return (
      trimmed.startsWith('pidr_signed_in=1') ||
      (trimmed.startsWith('auth_token=') && trimmed.length > 'auth_token='.length)
    );
  });
}

/** Можно ли дергать защищённые API без заведомого 401 у гостя. */
export function hasClientAuthHint(): boolean {
  if (hasAuthTokenCookie()) return true;
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp;
  return Boolean(tg?.initData && tg.initData.length > 0 && tg.initDataUnsafe?.user?.id);
}
