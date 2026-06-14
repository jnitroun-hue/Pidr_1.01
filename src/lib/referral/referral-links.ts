import { REFERRAL_QUERY_PARAM } from './constants';

/** Публичный URL сайта (после делегирования .ru — основной домен) */
export function getPublicAppUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (fromEnv) {
    const trimmed = fromEnv.replace(/\/$/, '');
    if (trimmed.startsWith('http')) return trimmed;
    return `https://${trimmed}`;
  }

  return 'https://www.pidr1-01.ru';
}

/** Универсальная реф-ссылка: регистрация любым способом на сайте */
export function buildReferralLink(referrerUserId: number | string): string {
  const base = getPublicAppUrl();
  const code = String(referrerUserId).trim();
  return `${base}/?${REFERRAL_QUERY_PARAM}=${encodeURIComponent(code)}`;
}

/** Нормализация кода из URL / Telegram start_param / cookie */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let code = raw.trim();
  if (!code) return null;
  if (code.startsWith('ref_')) code = code.slice(4);
  if (code.startsWith('invite_')) {
    const parts = code.replace(/^invite_/, '').split('_');
    const refIdx = parts.indexOf('ref');
    if (refIdx !== -1 && parts[refIdx + 1]) return parts[refIdx + 1];
    if (parts[0]) return parts[0];
  }
  return code;
}

/** Текст для шаринга (Telegram / буфер) */
export function buildReferralShareText(link: string): string {
  return (
    `🎮 Присоединяйся к The Must!\n\n` +
    `Зарегистрируйся удобным способом (сайт, VK, Google) — реферал засчитается автоматически.\n\n` +
    `${link}`
  );
}
