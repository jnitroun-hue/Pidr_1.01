import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/admin/users
 * Получить список всех пользователей (только для админов)
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (adminCheck.error || !adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    // Получаем параметры пагинации
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Получаем список пользователей
    let query = supabase
      .from('_pidr_users')
      .select('telegram_id, username, coins, total_games, wins, losses, is_admin, created_at, last_login_at, is_active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('❌ [Admin Users] Ошибка получения пользователей:', error);
      return NextResponse.json({
        success: false,
        error: 'Ошибка получения данных'
      }, { status: 500 });
    }

    // Получаем общее количество
    const { count: totalCount } = await supabase
      .from('_pidr_users')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('❌ [Admin Users] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Обновить данные пользователя (только для админов)
 */
export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (adminCheck.error || !adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    const body = await req.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json({
        success: false,
        error: 'Не указан userId или updates'
      }, { status: 400 });
    }

    // Обновляем пользователя
    const { data, error } = await supabase
      .from('_pidr_users')
      .update(updates)
      .eq('telegram_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Admin Users] Ошибка обновления:', error);
      return NextResponse.json({
        success: false,
        error: 'Ошибка обновления данных'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error: any) {
    console.error('❌ [Admin Users] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

