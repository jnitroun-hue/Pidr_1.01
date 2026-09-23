/** Публичный https-адрес сайта. В проде URL иногда лежит без схемы. */
export function publicAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.pidr1-01.ru')
    .trim()
    .replace(/\/$/, '');
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  return `https://${raw}`;
}

/** YooKassa подключена (оплата картой / ЮMoney через платформу) */
export function isYooKassaConfigured(): boolean {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}
