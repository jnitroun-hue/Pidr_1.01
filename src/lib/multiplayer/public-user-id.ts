/** Redis/lobby key: telegram_id если есть, иначе числовой id из БД (web) */
export function getRedisUserId(user: {
  id: number;
  telegram_id?: number | string | null;
}): string {
  if (user.telegram_id != null && String(user.telegram_id).trim() !== '') {
    return String(user.telegram_id);
  }
  return String(user.id);
}

/** Публичный ID игрока для сравнения в лобби (telegram_id или db id для web) */
export function getMultiplayerPublicUserId(user: {
  id?: number | string | null;
  telegramId?: string | number | null;
} | null | undefined): string {
  if (!user) return '';
  if (user.telegramId != null && String(user.telegramId).trim() !== '') {
    return String(user.telegramId);
  }
  if (user.id != null) {
    return String(user.id);
  }
  return '';
}

export function getTelegramIdFromWindow(): string {
  if (typeof window === 'undefined') return '';
  const fromWebApp = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return fromWebApp ? String(fromWebApp) : '';
}

export function resolveLobbyUserId(
  authUser: { id?: number | string; telegramId?: string | number } | null | undefined
): string {
  const fromWindow = getTelegramIdFromWindow();
  if (fromWindow) return fromWindow;
  return getMultiplayerPublicUserId(authUser);
}
