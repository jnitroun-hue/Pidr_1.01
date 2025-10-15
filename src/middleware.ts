import { NextRequest, NextResponse } from 'next/server';

// Публичные пути (НЕ требуют авторизации)
const publicPaths: string[] = [
  '/',      // Главная страница (меню)
  '/auth',  // Страница авторизации
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Если это публичный путь - пропускаем
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }
  
  // ВСЁ ОСТАЛЬНОЕ ТРЕБУЕТ АВТОРИЗАЦИЮ!
  console.log(`🔍 [Middleware] Проверка авторизации для: ${pathname}`);
  
  const allCookies = Array.from(req.cookies.getAll()).map(c => c.name);
  console.log(`🍪 [Middleware] Все куки в запросе:`, allCookies);
  
  const sessionCookie = req.cookies.get('pidr_session')?.value;
  console.log(`🍪 [Middleware] pidr_session:`, sessionCookie ? 'ЕСТЬ' : 'НЕТ');
  
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie);
      const hasUserId = !!(sessionData.userId || sessionData.user_id || 
                          sessionData.telegramId || sessionData.telegram_id || 
                          sessionData.id);
      isAuthenticated = hasUserId;
    } catch (error) {
      isAuthenticated = false;
    }
  }

  // Если НЕ авторизован - редирект на /auth
  if (!isAuthenticated) {
    console.log(`🔒 Redirecting to /auth from ${pathname} (no session)`);
    const authUrl = new URL('/auth', req.url);
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
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
