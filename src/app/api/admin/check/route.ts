import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';

/**
 * GET /api/admin/check
 * Проверка прав администратора текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    // ✅ ИСПРАВЛЕНО: Возвращаем success: true даже если не админ, но пользователь авторизован
    if (adminCheck.error || !adminCheck.isAdmin) {
      // Если ошибка авторизации - возвращаем 401, иначе 200 с isAdmin: false
      const status = adminCheck.error?.includes('Unauthorized') || adminCheck.error?.includes('Требуется авторизация') ? 401 : 200;
      
      return NextResponse.json({
        success: status === 200, // success: true если пользователь авторизован, но не админ
        isAdmin: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      userId: adminCheck.userId
    });
  } catch (error: any) {
    console.error('❌ [Admin Check] Ошибка:', error);
    // ✅ ИСПРАВЛЕНО: Возвращаем 200 вместо 500, чтобы не ломать UI
    return NextResponse.json({
      success: false,
      isAdmin: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 200 });
  }
}

