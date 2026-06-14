/** Query-параметр в URL: https://www.pidr1-01.ru/?ref=6 */
export const REFERRAL_QUERY_PARAM = 'ref';

/** Cookie / localStorage — храним до регистрации или первого входа */
export const PENDING_REFERRAL_COOKIE = 'pending_referral_code';

/** Срок хранения реф-кода у гостя (30 дней) */
export const PENDING_REFERRAL_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export type ReferralAuthMethod =
  | 'web'
  | 'telegram'
  | 'vk'
  | 'google'
  | 'email'
  | 'apple'
  | 'unknown';
