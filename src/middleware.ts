import { NextRequest, NextResponse } from 'next/server';

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
  const { pathname } = req.nextUrl;
  
  // ВСЁ ДОСТУПНО БЕЗ АВТОРИЗАЦИИ!
  // Авторизация нужна только для некоторых API и действий внутри страниц
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
