import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { describePromoReward, normalizePromoCode, type PromoRewardType } from '@/lib/promo/promo-rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  return response;
}

const PROMO_ERRORS: Record<string, { status: number; message: string }> = {
  PROMO_NOT_FOUND: { status: 404, message: 'Такого промокода нет. Проверьте написание.' },
  PROMO_INACTIVE: { status: 410, message: 'Промокод отключён.' },
  PROMO_EXPIRED: { status: 410, message: 'Срок действия промокода истёк.' },
  PROMO_EXHAUSTED: { status: 410, message: 'Лимит активаций промокода исчерпан.' },
  PROMO_ALREADY_REDEEMED: { status: 409, message: 'Вы уже активировали этот промокод.' },
  PROMO_UNSUPPORTED_REWARD: { status: 500, message: 'Награда этого промокода пока не поддерживается.' },
  USER_NOT_FOUND: { status: 404, message: 'Пользователь не найден.' },
};

function migrationMissing(error: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST202' ||
    /redeem_pidr_promocode|_pidr_promocode_redemptions|schema cache|does not exist/i.test(error?.message || '')
  );
}

/** POST /api/promocode { code } — активировать промокод */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code = normalizePromoCode(body?.code);
    if (!code) {
      return noStoreJson({ success: false, code: 'PROMO_EMPTY', message: 'Введите промокод' }, { status: 400 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.rpc('redeem_pidr_promocode', {
      p_user_id: dbUserId,
      p_code: code,
    });

    if (error) {
      const known = Object.keys(PROMO_ERRORS).find((key) => (error.message || '').includes(key));
      if (known) {
        return noStoreJson(
          { success: false, code: known, message: PROMO_ERRORS[known].message },
          { status: PROMO_ERRORS[known].status }
        );
      }
      if (migrationMissing(error)) {
        return noStoreJson(
          {
            success: false,
            code: 'PROMO_DB_MIGRATION_REQUIRED',
            message: 'Промокоды ещё не включены на сервере.',
            hint: 'Выполните scripts/sql/promocodes.sql в Supabase SQL Editor.',
          },
          { status: 503 }
        );
      }
      console.error('❌ [POST /api/promocode] rpc:', error);
      return noStoreJson({ success: false, message: 'Не удалось активировать промокод' }, { status: 500 });
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | {
          promocode_id: number;
          reward_type: PromoRewardType;
          reward_value: number;
          new_balance: number | null;
          premium_expires_at: string | null;
          new_rating: number | null;
        }
      | undefined;

    if (!row) {
      return noStoreJson({ success: false, message: 'Пустой ответ сервера' }, { status: 500 });
    }

    const rewardText = describePromoReward(row.reward_type, row.reward_value);

    return noStoreJson({
      success: true,
      message: `Промокод ${code} активирован: ${rewardText}`,
      data: {
        code,
        rewardType: row.reward_type,
        rewardValue: row.reward_value,
        rewardText,
        newBalance: row.new_balance,
        premiumExpiresAt: row.premium_expires_at,
        newRating: row.new_rating,
      },
    });
  } catch (error) {
    console.error('❌ [POST /api/promocode]', error);
    return noStoreJson(
      { success: false, message: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

/** GET /api/promocode — история активаций текущего пользователя */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
  }

  try {
    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('_pidr_promocode_redemptions')
      .select('code, reward_type, reward_value, redeemed_at')
      .eq('user_id', dbUserId)
      .order('redeemed_at', { ascending: false })
      .limit(20);

    if (error) {
      if (migrationMissing(error)) {
        return noStoreJson({ success: true, redemptions: [], configured: false });
      }
      console.error('❌ [GET /api/promocode]', error);
      return noStoreJson({ success: false, message: 'Не удалось загрузить историю' }, { status: 500 });
    }

    return noStoreJson({
      success: true,
      configured: true,
      redemptions: (
        (data || []) as Array<{ code: string; reward_type: string; reward_value: number; redeemed_at: string }>
      ).map((r) => ({
        code: r.code,
        rewardType: r.reward_type,
        rewardValue: r.reward_value,
        rewardText: describePromoReward(r.reward_type as PromoRewardType, r.reward_value),
        redeemedAt: r.redeemed_at,
      })),
    });
  } catch (error) {
    console.error('❌ [GET /api/promocode]', error);
    return noStoreJson({ success: false, message: 'Ошибка сервера' }, { status: 500 });
  }
}
