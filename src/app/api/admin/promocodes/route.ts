import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/admin/promocodes
 * Получить список промокодов (только для админов)
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Получаем промокоды
    const { data: promocodes, error: promocodesError } = await supabase
      .from('_pidr_promocodes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (promocodesError) {
      console.error('❌ Ошибка загрузки промокодов:', promocodesError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка загрузки промокодов'
      }, { status: 500 });
    }

    // Получаем общее количество
    const { count, error: countError } = await supabase
      .from('_pidr_promocodes')
      .select('*', { count: 'exact', head: true });

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      promocodes: promocodes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('❌ [Admin Promocodes] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/promocodes
 * Создать новый промокод (только для админов)
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    const body = await req.json();
    const { code, description, reward_type, reward_value, max_uses, expires_at } = body;

    if (!code || !reward_type || !reward_value) {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно данных для создания промокода'
      }, { status: 400 });
    }

    // Проверяем уникальность кода
    const { data: existing } = await supabase
      .from('_pidr_promocodes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Промокод с таким кодом уже существует'
      }, { status: 400 });
    }

    // Создаем промокод
    const { data: promocode, error: createError } = await supabase
      .from('_pidr_promocodes')
      .insert({
        code: code.toUpperCase(),
        description: description || null,
        reward_type: reward_type,
        reward_value: parseInt(reward_value),
        max_uses: max_uses ? parseInt(max_uses) : null,
        used_count: 0,
        expires_at: expires_at || null,
        is_active: true,
        created_by: adminCheck.userId
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Ошибка создания промокода:', createError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка создания промокода'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      promocode
    });
  } catch (error: any) {
    console.error('❌ [Admin Promocodes] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/promocodes
 * Обновить промокод (только для админов)
 */
export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    const body = await req.json();
    const { promocode_id, updates } = body;

    if (!promocode_id || !updates) {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно данных для обновления'
      }, { status: 400 });
    }

    // Обновляем промокод
    const { data: promocode, error: updateError } = await supabase
      .from('_pidr_promocodes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', promocode_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Ошибка обновления промокода:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка обновления промокода'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      promocode
    });
  } catch (error: any) {
    console.error('❌ [Admin Promocodes] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

