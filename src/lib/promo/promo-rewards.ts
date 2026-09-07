/** Общие типы и форматирование наград промокодов (клиент + сервер). */

export const PROMO_REWARD_TYPES = [
  { id: 'coins', label: 'Монеты', unit: 'монет', hint: 'Начисляются на баланс сразу' },
  { id: 'premium_days', label: 'Premium (дни)', unit: 'дней Premium', hint: 'Продлевает или включает Premium' },
  { id: 'rating', label: 'Рейтинг', unit: 'очков рейтинга', hint: 'Добавляется к рейтингу игрока' },
] as const;

export type PromoRewardType = (typeof PROMO_REWARD_TYPES)[number]['id'];

export function isPromoRewardType(value: unknown): value is PromoRewardType {
  return typeof value === 'string' && PROMO_REWARD_TYPES.some((t) => t.id === value);
}

/** Код: только A–Z, 0–9, дефис и подчёркивание; верхний регистр; 3–32 символа. */
export function normalizePromoCode(raw: unknown): string {
  const code = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return '';
  return code;
}

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function describePromoReward(type: PromoRewardType | string, value: number): string {
  const v = Number(value) || 0;
  switch (type) {
    case 'coins':
      return `+${v.toLocaleString('ru-RU')} ${plural(v, 'монета', 'монеты', 'монет')}`;
    case 'premium_days':
      return `+${v} ${plural(v, 'день', 'дня', 'дней')} Premium`;
    case 'rating':
      return `+${v} ${plural(v, 'очко', 'очка', 'очков')} рейтинга`;
    default:
      return `${type}: ${v}`;
  }
}

export function promoRewardLabel(type: PromoRewardType | string): string {
  return PROMO_REWARD_TYPES.find((t) => t.id === type)?.label ?? String(type);
}
