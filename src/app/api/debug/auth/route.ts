import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '../../../../lib/auth-utils';

export async function GET(req: NextRequest) {
  console.log('🔍 [DEBUG] Проверка авторизации...');
  
  try {
    // Проверяем переменные окружения
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const hasSupabaseUrl = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
    const hasSupabaseKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
    
    // Проверяем cookies
    const cookies = req.cookies.getAll();
    const authCookie = req.cookies.get('auth_token');
    
    // Проверяем headers
    const authHeader = req.headers.get('authorization');
    
    // Пробуем получить userId
    const userId = getUserIdFromRequest(req);
    
    const debug = {
      environment: {
        hasJwtSecret,
        hasSupabaseUrl,
        hasSupabaseKey,
        nodeEnv: process.env.NODE_ENV
      },
      request: {
        cookies: cookies.map((c: any) => ({ name: c.name, hasValue: !!c.value })),
        authCookie: authCookie ? { hasValue: !!authCookie.value, length: authCookie.value?.length } : null,
        authHeader: authHeader ? { hasValue: true, type: authHeader.startsWith('Bearer ') ? 'Bearer' : 'Other' } : null,
        url: req.url,
        method: req.method
      },
      auth: {
        userId,
        isAuthenticated: !!userId
      }
    };
    
    console.log('🔍 [DEBUG] Результат проверки:', debug);
    
    return NextResponse.json({
      success: true,
      debug,
      message: userId ? 'Пользователь авторизован' : 'Пользователь не авторизован'
    });
    
  } catch (error: unknown) {
    console.error('❌ [DEBUG] Ошибка проверки авторизации:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
