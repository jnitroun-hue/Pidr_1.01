import { NextResponse } from 'next/server';

export const AUTH_TOKEN_COOKIE = 'auth_token';
/** Видимая клиенту метка сессии (JWT httpOnly и не читается из document.cookie). */
export const SIGNED_IN_COOKIE = 'pidr_signed_in';

const MAX_AGE = 30 * 24 * 60 * 60;

export type AuthCookieSameSite = 'lax' | 'none';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

/** Общий Domain для www и apex, чтобы сессия не терялась при переходе pidr1-01.ru ↔ www. */
export function authCookieDomain(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!raw) return undefined;
  try {
    const hostname = new URL(raw).hostname.toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')) return undefined;
    const apex = hostname.replace(/^www\./, '');
    if (!apex.includes('.')) return undefined;
    return `.${apex}`;
  } catch {
    return undefined;
  }
}

/**
 * Production HTTPS: SameSite=None; Secure — работает и в обычном браузере на купленном домене,
 * и внутри iframe Telegram/VK. Localhost: Lax без Secure.
 */
export function resolveAuthCookieOptions(overrides?: {
  sameSite?: AuthCookieSameSite;
  secure?: boolean;
  maxAge?: number;
  domain?: string | undefined;
}) {
  const prod = isProduction();
  return {
    sameSite: (overrides?.sameSite ?? (prod ? 'none' : 'lax')) as AuthCookieSameSite,
    secure: overrides?.secure ?? prod,
    maxAge: overrides?.maxAge ?? MAX_AGE,
    domain: overrides?.domain ?? (prod ? authCookieDomain() : undefined),
  };
}

export function authCookieBase(opts?: {
  sameSite?: AuthCookieSameSite;
  secure?: boolean;
  maxAge?: number;
  domain?: string;
}) {
  const resolved = resolveAuthCookieOptions(opts);
  return {
    path: '/',
    maxAge: resolved.maxAge,
    secure: resolved.secure,
    sameSite: resolved.sameSite,
    ...(resolved.domain ? { domain: resolved.domain } : {}),
  };
}

export function setAuthCookies(
  response: NextResponse,
  token: string,
  opts?: { sameSite?: AuthCookieSameSite; secure?: boolean; maxAge?: number; domain?: string }
) {
  const base = authCookieBase(opts);
  response.cookies.set(AUTH_TOKEN_COOKIE, token, { ...base, httpOnly: true });
  response.cookies.set(SIGNED_IN_COOKIE, '1', { ...base, httpOnly: false });
}

export function clearAuthCookies(response: NextResponse) {
  const secure = isProduction();
  const domain = authCookieDomain();
  const hosts: Array<string | undefined> = domain ? [domain, undefined] : [undefined];
  for (const cookieDomain of hosts) {
    for (const sameSite of ['lax', 'none'] as const) {
      const opts = {
        path: '/',
        maxAge: 0,
        secure: secure || sameSite === 'none',
        sameSite,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      };
      response.cookies.set(AUTH_TOKEN_COOKIE, '', { ...opts, httpOnly: true });
      response.cookies.set(SIGNED_IN_COOKIE, '', { ...opts, httpOnly: false });
    }
  }
}
