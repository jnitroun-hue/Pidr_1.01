import { NextResponse } from 'next/server';

export const AUTH_TOKEN_COOKIE = 'auth_token';
/** Видимая клиенту метка сессии (JWT httpOnly и не читается из document.cookie). */
export const SIGNED_IN_COOKIE = 'pidr_signed_in';

const MAX_AGE = 30 * 24 * 60 * 60;

export type AuthCookieSameSite = 'lax' | 'none';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

export function authCookieBase(opts?: {
  sameSite?: AuthCookieSameSite;
  secure?: boolean;
  maxAge?: number;
}) {
  return {
    path: '/',
    maxAge: opts?.maxAge ?? MAX_AGE,
    secure: opts?.secure ?? isProduction(),
    sameSite: opts?.sameSite ?? ('lax' as AuthCookieSameSite),
  };
}

export function setAuthCookies(
  response: NextResponse,
  token: string,
  opts?: { sameSite?: AuthCookieSameSite; secure?: boolean; maxAge?: number }
) {
  const base = authCookieBase(opts);
  response.cookies.set(AUTH_TOKEN_COOKIE, token, { ...base, httpOnly: true });
  response.cookies.set(SIGNED_IN_COOKIE, '1', { ...base, httpOnly: false });
}

export function clearAuthCookies(response: NextResponse) {
  const secure = isProduction();
  for (const sameSite of ['lax', 'none'] as const) {
    const opts = {
      path: '/',
      maxAge: 0,
      secure: secure || sameSite === 'none',
      sameSite,
    };
    response.cookies.set(AUTH_TOKEN_COOKIE, '', { ...opts, httpOnly: true });
    response.cookies.set(SIGNED_IN_COOKIE, '', { ...opts, httpOnly: false });
  }
}
