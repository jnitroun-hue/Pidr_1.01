import { NextRequest, NextResponse } from 'next/server';

// Защищенные пути (требуют авторизации)
const protectedPaths: string[] = [
  '/profile',
  '/game',
];

// Пути авторизации (куда редиректить неавторизованных)
const authPath = '/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Пропускаем проверку для страницы авторизации и главной
  if (pathname === authPath || pathname === '/') {
    return NextResponse.next();
  }
  
  // Проверяем наличие сессии (cookie pidr_session)
  const sessionCookie = req.cookies.get('pidr_session')?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie);
      // Проверяем наличие userId или telegramId
      const hasUserId = !!(sessionData.userId || sessionData.user_id || 
                          sessionData.telegramId || sessionData.telegram_id || 
                          sessionData.id);
      isAuthenticated = hasUserId;
    } catch (error) {
      // Cookie существует, но не валиден
      console.error('❌ Invalid session cookie:', error);
      isAuthenticated = false;
    }
  }

  // Если пользователь не авторизован и пытается попасть на защищенную страницу
  if (!isAuthenticated && protectedPaths.some(path => pathname.startsWith(path))) {
    console.log(`🔒 Redirecting to /auth from ${pathname} (no session)`);
    const authUrl = new URL(authPath, req.url);
    // Сохраняем URL для редиректа после авторизации
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
  }

  // Если пользователь авторизован и пытается попасть на страницу авторизации
  if (isAuthenticated && pathname === authPath) {
    console.log(`✅ Redirecting to / from /auth (already authenticated)`);
    const homeUrl = new URL('/', req.url);
    return NextResponse.redirect(homeUrl);
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
