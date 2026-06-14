import { NextRequest, NextResponse } from 'next/server';
import {
  PENDING_REFERRAL_COOKIE,
  PENDING_REFERRAL_MAX_AGE_SEC,
  REFERRAL_QUERY_PARAM,
} from '@/lib/referral/constants';
import { normalizeReferralCode } from '@/lib/referral/referral-links';

// Публичные пути (НЕ требуют авторизации)
const publicPaths: string[] = [
  '/',           // Главная страница (меню)
  '/auth',       // Страница авторизации
  '/game',       // Игра (single player работает без авторизации)
  '/rules',      // Правила
  '/shop',       // Магазин
  '/friends',    // Друзья
  '/rating',     // Рейтинг
  '/settings',   // Настройки
  '/multiplayer', // Мультиплеер
];

export function middleware(req: NextRequest) {
  const refRaw = req.nextUrl.searchParams.get(REFERRAL_QUERY_PARAM)
    || req.nextUrl.searchParams.get('invite');
  const refCode = normalizeReferralCode(refRaw);

  if (refCode) {
    const res = NextResponse.next();
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    res.cookies.set(PENDING_REFERRAL_COOKIE, refCode, {
      path: '/',
      maxAge: PENDING_REFERRAL_MAX_AGE_SEC,
      sameSite: 'lax',
      secure: isProduction,
      httpOnly: false,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}
