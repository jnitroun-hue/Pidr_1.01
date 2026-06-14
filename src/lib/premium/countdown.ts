/** Обратный отсчёт до окончания Premium */

export interface PremiumCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
  progressPercent: number;
}

const PREMIUM_MS = 30 * 24 * 60 * 60 * 1000;

export function getPremiumCountdown(
  expiresAt: string | null,
  startedAt?: string | null
): PremiumCountdown {
  if (!expiresAt) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true, progressPercent: 0 };
  }

  const end = new Date(expiresAt).getTime();
  const totalMs = Math.max(0, end - Date.now());
  const expired = totalMs <= 0;

  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);

  let progressPercent = 0;
  if (!expired) {
    const startMs = startedAt
      ? new Date(startedAt).getTime()
      : end - PREMIUM_MS;
    const duration = Math.max(end - startMs, 1);
    progressPercent = Math.min(100, Math.max(0, ((duration - totalMs) / duration) * 100));
  } else {
    progressPercent = 100;
  }

  return { days, hours, minutes, seconds, totalMs, expired, progressPercent };
}

export function formatCountdownLabel(c: PremiumCountdown): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (c.days > 0) return `${c.days}д ${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
  return `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
}

/** Обратный отсчёт до целевой даты (например, следующая бесплатная генерация) */
export function getTargetCountdown(targetAt: string | null): PremiumCountdown {
  if (!targetAt) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true, progressPercent: 100 };
  }

  const end = new Date(targetAt).getTime();
  const totalMs = Math.max(0, end - Date.now());
  const expired = totalMs <= 0;

  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    expired,
    progressPercent: expired ? 100 : 0,
  };
}
