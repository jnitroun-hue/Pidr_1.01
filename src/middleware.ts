import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// ВРЕМЕННО УБРАНО: Все страницы доступны без авторизации
const protectedPaths: string[] = [];

// Пути авторизации, куда не должны попадать авторизованные пользователи
const authPaths = [
  '/auth/login',
  '/auth/register'
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Получаем токен из cookies или заголовка Authorization
  const token = req.cookies.get('auth_token')?.value || 
                req.headers.get('authorization')?.replace('Bearer ', '');

  let isAuthenticated = false;

  if (token && JWT_SECRET) {
    try {
      jwt.verify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      // Токен недействителен
      isAuthenticated = false;
    }
  }

  // Если пользователь не авторизован и пытается попасть на защищенную страницу
  if (!isAuthenticated && protectedPaths.some(path => pathname.startsWith(path))) {
    const loginUrl = new URL('/auth/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Если пользователь авторизован и пытается попасть на страницы входа/регистрации
  if (isAuthenticated && authPaths.some(path => pathname.startsWith(path))) {
    const homeUrl = new URL('/', req.url);
    return NextResponse.redirect(homeUrl);
  }

  // Убрано: теперь главная страница доступна всем без авторизации

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
