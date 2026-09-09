import { NextRequest, NextResponse } from 'next/server';
import {
  PENDING_REFERRAL_COOKIE,
  PENDING_REFERRAL_MAX_AGE_SEC,
  REFERRAL_QUERY_PARAM,
} from '@/lib/referral/constants';
import { normalizeReferralCode } from '@/lib/referral/referral-links';

function canonicalHostRedirect(req: NextRequest): NextResponse | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (!raw) return null;
  let canonical: URL;
  try {
    canonical = new URL(raw);
  } catch {
    return null;
  }
  const requestHost = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  const targetHost = canonical.hostname.toLowerCase();
  if (!requestHost || !targetHost) return null;
  if (requestHost === 'localhost' || requestHost.endsWith('.vercel.app')) return null;
  if (requestHost === targetHost) return null;
  const requestApex = requestHost.replace(/^www\./, '');
  const targetApex = targetHost.replace(/^www\./, '');
  if (requestApex !== targetApex) return null;
  const dest = new URL(req.nextUrl.pathname + req.nextUrl.search, canonical.origin);
  return NextResponse.redirect(dest, 308);
}

export function middleware(req: NextRequest) {
  const hostRedirect = canonicalHostRedirect(req);
  if (hostRedirect) return hostRedirect;

  const refRaw = req.nextUrl.searchParams.get(REFERRAL_QUERY_PARAM)
    || req.nextUrl.searchParams.get('invite');
  const refCode = normalizeReferralCode(refRaw);

  if (refCode) {
    const res = NextResponse.next();
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    res.cookies.set(PENDING_REFERRAL_COOKIE, refCode, {
      path: '/',
      maxAge: PENDING_REFERRAL_MAX_AGE_SEC,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      httpOnly: false,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};
