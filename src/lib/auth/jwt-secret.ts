/**
 * Секрет подписи auth JWT.
 * В Vercel + Supabase — переменная SUPABASE_JWT_SECRET из интеграции.
 */

export function getJwtSecret(): string | undefined {
  return process.env.SUPABASE_JWT_SECRET || process.env.SESSION_SECRET || undefined;
}

export function requireJwtSecret(): string {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET не настроен');
  }
  return secret;
}

export function hasJwtSecret(): boolean {
  return !!getJwtSecret();
}

/** Секрет для jwt.sign / jwt.verify (пустая строка если не задан — проверяйте hasJwtSecret) */
export const JWT_SECRET = getJwtSecret() || '';
