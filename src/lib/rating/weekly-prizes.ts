/** Еженедельные призы топ-10 рейтинга */

import { formatGramAmount } from '@/lib/crypto/gram-brand';

export type WeeklyPrizeType = 'ton' | 'coins';

export interface WeeklyPlacePrize {
  place: number;
  type: WeeklyPrizeType;
  amount: number;
  label: string;
}

export const WEEKLY_TOP_PRIZES: WeeklyPlacePrize[] = [
  { place: 1, type: 'ton', amount: 20, label: formatGramAmount(20) },
  { place: 2, type: 'ton', amount: 10, label: formatGramAmount(10) },
  { place: 3, type: 'ton', amount: 5, label: formatGramAmount(5) },
  { place: 4, type: 'coins', amount: 15000, label: '15 000 монет' },
  { place: 5, type: 'coins', amount: 12000, label: '12 000 монет' },
  { place: 6, type: 'coins', amount: 10000, label: '10 000 монет' },
  { place: 7, type: 'coins', amount: 8000, label: '8 000 монет' },
  { place: 8, type: 'coins', amount: 6000, label: '6 000 монет' },
  { place: 9, type: 'coins', amount: 4000, label: '4 000 монет' },
  { place: 10, type: 'coins', amount: 1000, label: '1 000 монет' },
];

export function getWeeklyPlacePrize(place: number): WeeklyPlacePrize | null {
  return WEEKLY_TOP_PRIZES.find((p) => p.place === place) ?? null;
}

/** ISO-неделя: 2026-W23 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Неделя, за которую начисляем призы (cron в понедельник → прошедшая неделя) */
export function getPayoutWeekKey(refDate = new Date()): string {
  const d = new Date(refDate);
  d.setUTCDate(d.getUTCDate() - 1);
  return getISOWeekKey(d);
}

export function buildPayoutIdempotencyKey(weekKey: string, place: number, userId: number | string): string {
  return `week:${weekKey}:place:${place}:user:${userId}`;
}

/** Следующий понедельник 00:00 UTC */
export function getNextWeeklyPayoutDate(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function formatWeeklyPayoutDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}
