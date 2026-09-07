import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { isPromoRewardType, normalizePromoCode } from '@/lib/promo/promo-rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PromoInput = {
  code?: unknown;
  description?: unknown;
  reward_type?: unknown;
  reward_value?: unknown;
  max_uses?: unknown;
  per_user_limit?: unknown;
  expires_at?: unknown;
  is_active?: unknown;
};

function adminError(adminCheck: { error?: string }) {
  return NextResponse.json(
    { success: false, error: adminCheck.error || 'Требуются права администратора' },
    { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 }
  );
}

function toPositiveInt(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toIsoOrNull(value: unknown): string | null | 'invalid' {
  if (value === '' || value === null || value === undefined) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return 'invalid';
  return d.toISOString();
}

/** Валидация полей промокода; `partial` — для PATCH (проверяем только переданные). */
function validatePromo(input: PromoInput, partial: boolean): { ok: true; row: Record<string, unknown> } | { ok: false; error: string } {
  const row: Record<string, unknown> = {};

  if (!partial || input.code !== undefined) {
    const code = normalizePromoCode(input.code);
    if (!code) return { ok: false, error: 'Код: 3–32 символа, только A–Z, 0–9, «-» и «_»' };
    row.code = code;
  }

  if (!partial || input.reward_type !== undefined) {
    if (!isPromoRewardType(input.reward_type)) {
      return { ok: false, error: 'Тип награды: coins, premium_days или rating' };
    }
    row.reward_type = input.reward_type;
  }

  if (!partial || input.reward_value !== undefined) {
    const value = toPositiveInt(input.reward_value);
    if (!value) return { ok: false, error: 'Значение награды должно быть положительным числом' };
    if (row.reward_type === 'premium_days' && value > 3650) {
      return { ok: false, error: 'Premium: не больше 3650 дней' };
    }
    row.reward_value = value;
  }

  if (input.description !== undefined) {
    row.description = input.description ? String(input.description).trim().slice(0, 500) : null;
  }

  if (input.max_uses !== undefined) {
    if (input.max_uses !== null && input.max_uses !== '' && toPositiveInt(input.max_uses) === null) {
      return { ok: false, error: 'Лимит активаций — положительное число или пусто (безлимит)' };
    }
    row.max_uses = toPositiveInt(input.max_uses);
  }

  if (input.per_user_limit !== undefined) {
    const perUser = toPositiveInt(input.per_user_limit);
    if (!perUser) return { ok: false, error: 'Лимит на игрока — минимум 1' };
    row.per_user_limit = perUser;
  }

  if (input.expires_at !== undefined) {
    const iso = toIsoOrNull(input.expires_at);
    if (iso === 'invalid') return { ok: false, error: 'Некорректная дата окончания' };
    row.expires_at = iso;
  }

  if (input.is_active !== undefined) {
    row.is_active = Boolean(input.is_active);
  }

  return { ok: true, row };
}

/** Колонка per_user_limit появляется после scripts/sql/promocodes.sql — без неё не роняем запрос. */
function stripMissingColumn(row: Record<string, unknown>, error: { message?: string } | null) {
  if (error?.message && /per_user_limit/i.test(error.message)) {
    const { per_user_limit: _omit, ...rest } = row;
    return rest;
  }
  return null;
}

/**
 * GET /api/admin/promocodes?page=&limit=&search=&status=all|active|inactive
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.isAdmin) return adminError(adminCheck);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = (searchParams.get('search') || '').trim().toUpperCase();
    const status = searchParams.get('status') || 'all';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('_pidr_promocodes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike('code', `%${search}%`);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    const { data: promocodes, error, count } = await query;

    if (error) {
      console.error('❌ Ошибка загрузки промокодов:', error);
      return NextResponse.json({ success: false, error: 'Ошибка загрузки промокодов' }, { status: 500 });
    }

    // Сводка по всем промокодам (не только текущей странице)
    const { data: allRows } = await supabaseAdmin
      .from('_pidr_promocodes')
      .select('is_active, used_count, expires_at');
    const now = Date.now();
    type StatRow = { is_active: boolean | null; used_count: number | null; expires_at: string | null };
    const stats = ((allRows || []) as StatRow[]).reduce(
      (acc: { total: number; active: number; redemptions: number }, r: StatRow) => {
        acc.total += 1;
        const expired = r.expires_at ? new Date(r.expires_at).getTime() < now : false;
        if (r.is_active && !expired) acc.active += 1;
        acc.redemptions += Number(r.used_count) || 0;
        return acc;
      },
      { total: 0, active: 0, redemptions: 0 }
    );

    return NextResponse.json({
      success: true,
      promocodes: promocodes || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    });
  } catch (error) {
    console.error('❌ [Admin Promocodes GET]', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/admin/promocodes — создать промокод
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.isAdmin) return adminError(adminCheck);

    const body = (await req.json().catch(() => ({}))) as PromoInput;
    const validated = validatePromo(
      { per_user_limit: 1, max_uses: null, expires_at: null, description: '', ...body },
      false
    );
    if (!validated.ok) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('_pidr_promocodes')
      .select('id')
      .eq('code', validated.row.code as string)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: 'Промокод с таким кодом уже существует' }, { status: 409 });
    }

    let insertRow: Record<string, unknown> = {
      ...validated.row,
      used_count: 0,
      is_active: validated.row.is_active ?? true,
      created_by: adminCheck.userId,
    };

    let { data: promocode, error } = await supabaseAdmin
      .from('_pidr_promocodes')
      .insert(insertRow)
      .select()
      .single();

    const fallbackRow = stripMissingColumn(insertRow, error);
    if (error && fallbackRow) {
      insertRow = fallbackRow;
      ({ data: promocode, error } = await supabaseAdmin
        .from('_pidr_promocodes')
        .insert(insertRow)
        .select()
        .single());
    }

    if (error) {
      console.error('❌ Ошибка создания промокода:', error);
      const constraint = /reward_type_check/i.test(error.message || '');
      return NextResponse.json(
        {
          success: false,
          error: constraint
            ? 'БД не принимает этот тип награды. Выполните scripts/sql/promocodes.sql.'
            : 'Ошибка создания промокода',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, promocode });
  } catch (error) {
    console.error('❌ [Admin Promocodes POST]', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/promocodes { promocode_id, updates } — изменить промокод
 */
export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.isAdmin) return adminError(adminCheck);

    const body = await req.json().catch(() => ({}));
    const promocodeId = Number(body?.promocode_id);
    const updates = (body?.updates ?? {}) as PromoInput;

    if (!Number.isFinite(promocodeId) || promocodeId <= 0 || Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'Недостаточно данных для обновления' }, { status: 400 });
    }

    const validated = validatePromo(updates, true);
    if (!validated.ok) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    if (validated.row.code) {
      const { data: clash } = await supabaseAdmin
        .from('_pidr_promocodes')
        .select('id')
        .eq('code', validated.row.code as string)
        .neq('id', promocodeId)
        .maybeSingle();
      if (clash) {
        return NextResponse.json({ success: false, error: 'Промокод с таким кодом уже существует' }, { status: 409 });
      }
    }

    let updateRow: Record<string, unknown> = { ...validated.row, updated_at: new Date().toISOString() };

    let { data: promocode, error } = await supabaseAdmin
      .from('_pidr_promocodes')
      .update(updateRow)
      .eq('id', promocodeId)
      .select()
      .single();

    const fallbackRow = stripMissingColumn(updateRow, error);
    if (error && fallbackRow) {
      updateRow = fallbackRow;
      ({ data: promocode, error } = await supabaseAdmin
        .from('_pidr_promocodes')
        .update(updateRow)
        .eq('id', promocodeId)
        .select()
        .single());
    }

    if (error) {
      console.error('❌ Ошибка обновления промокода:', error);
      return NextResponse.json({ success: false, error: 'Ошибка обновления промокода' }, { status: 500 });
    }

    return NextResponse.json({ success: true, promocode });
  } catch (error) {
    console.error('❌ [Admin Promocodes PATCH]', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/promocodes?id= — удалить промокод (история активаций удаляется каскадно)
 */
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.isAdmin) return adminError(adminCheck);

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ success: false, error: 'Не указан id промокода' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('_pidr_promocodes').delete().eq('id', id);
    if (error) {
      console.error('❌ Ошибка удаления промокода:', error);
      return NextResponse.json({ success: false, error: 'Ошибка удаления промокода' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [Admin Promocodes DELETE]', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
