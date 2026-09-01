export const PREMIUM_DURATION_DAYS = 30;
/** Актуальная цена по акции */
export const PREMIUM_PRICE_RUB = 299;
export const PREMIUM_PRICE_COINS = 30000;
/** Старая цена — только для перечёркивания в UI */
export const PREMIUM_PRICE_RUB_OLD = 499;
export const PREMIUM_PRICE_COINS_OLD = 35000;
export const PREMIUM_RATING_MULTIPLIER = 2;
/** Интервал между бесплатными Premium-генерациями (от created_at последней записи) */
export const PREMIUM_FREE_ROLL_COOLDOWN_DAYS = 7;
export const PREMIUM_FREE_ROLL_COOLDOWN_MS = PREMIUM_FREE_ROLL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export const PREMIUM_BENEFITS = [
  'Рейтинг ×2 за победы',
  'Живое пламя вокруг аватара — цвет выбираете сами',
  '1 бесплатная рандом-генерация раз в 7 дней',
  'Скидки на генерацию карт 20–35%',
  'Premium Shop: акция дня и эксклюзивы',
  'Расширенные темы главного меню',
] as const;
