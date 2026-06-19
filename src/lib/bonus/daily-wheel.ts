/** Значения сегментов колеса ежедневного бонуса (должны совпадать с UI и API). */
export const DAILY_WHEEL_AMOUNTS = [50, 75, 100, 125, 150, 175, 200] as const;

export const DAILY_WHEEL_SEGMENT_COLORS = [
  '#1d4ed8',
  '#2563eb',
  '#7c3aed',
  '#9333ea',
  '#059669',
  '#d97706',
  '#ea580c',
] as const;

export function pickDailyWheelAmount(): number {
  const index = Math.floor(Math.random() * DAILY_WHEEL_AMOUNTS.length);
  return DAILY_WHEEL_AMOUNTS[index];
}
