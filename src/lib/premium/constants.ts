export const PREMIUM_DURATION_DAYS = 30;
export const PREMIUM_PRICE_RUB = 499;
export const PREMIUM_PRICE_COINS = 30000;
export const PREMIUM_RATING_MULTIPLIER = 2;
/** Интервал между бесплатными Premium-генерациями (от created_at последней записи) */
export const PREMIUM_FREE_ROLL_COOLDOWN_DAYS = 7;
export const PREMIUM_FREE_ROLL_COOLDOWN_MS = PREMIUM_FREE_ROLL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export const PREMIUM_BENEFITS = [
  'Рейтинг ×2 за победы',
  'Голубое пламя вокруг аватара за столом',
  '1 бесплатная рандом-генерация раз в 7 дней',
  'Скидки на генерацию карт 20–35%',
] as const;
