import { NextRequest, NextResponse } from 'next/server';

// MIDDLEWARE ОТКЛЮЧЕН - ВСЕ СТРАНИЦЫ ДОСТУПНЫ БЕЗ АВТОРИЗАЦИИ
// Защищенные пути (требуют авторизации)
const protectedPaths: string[] = [
  // '/profile',
  // '/game',
];

export function middleware(req: NextRequest) {
  // Пропускаем все запросы без проверки
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
