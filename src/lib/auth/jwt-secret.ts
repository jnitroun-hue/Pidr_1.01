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

/** userId из JWT payload (strict-safe: undefined → null) */
export function getUserIdFromAuthPayload(payload: { userId?: string }): string | null {
  return payload.userId ?? null;
}

/** Секрет для jwt.sign / jwt.verify (пустая строка если не задан — проверяйте hasJwtSecret) */
export const JWT_SECRET = getJwtSecret() || '';
