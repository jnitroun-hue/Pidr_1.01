import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';

/**
 * GET /api/admin/check
 * Проверка прав администратора текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (adminCheck.error || !adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      userId: adminCheck.userId
    });
  } catch (error: any) {
    console.error('❌ [Admin Check] Ошибка:', error);
    return NextResponse.json({
      success: false,
      isAdmin: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

