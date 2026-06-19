/** YooKassa подключена (оплата картой / ЮMoney через платформу) */
export function isYooKassaConfigured(): boolean {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}
