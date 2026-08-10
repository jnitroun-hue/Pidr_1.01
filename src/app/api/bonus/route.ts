import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { pickDailyWheelAmount } from '@/lib/bonus/daily-wheel';
import {
  socialBonusConfig,
  verifySocialSubscription,
  type SocialBonusType,
} from '@/lib/bonus/social-subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BonusClaimRow {
  bonus_key: string;
  bonus_type: string;
  amount: number;
  claimed_at: string;
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function nextUtcDay(date = new Date()) {
  return new Date(`${utcDayKey(new Date(date.getTime() + 24 * 60 * 60 * 1000))}T00:00:00.000Z`);
}

function isDuplicateClaim(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate|unique/i.test(error?.message || '');
}

function migrationMissing(error: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST202' ||
    /claim_pidr_bonus|_pidr_bonus_claims|schema cache|does not exist/i.test(error?.message || '')
  );
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStoreJson(
      { success: false, message: auth.error || 'Требуется авторизация' },
      { status: 401 }
    );
  }

  try {
    const { bonusType } = await req.json();
    if (!bonusType || typeof bonusType !== 'string') {
      return noStoreJson({ success: false, message: 'Не указан тип бонуса' }, { status: 400 });
    }

    if (bonusType === 'referral') {
      return noStoreJson(
        { success: false, message: 'Реферальные бонусы начисляются автоматически.' },
        { status: 400 }
      );
    }
    if (bonusType === 'rank_up') {
      return noStoreJson(
        { success: false, message: 'Бонус ранга начисляется автоматически после достижения нового ранга.' },
        { status: 400 }
      );
    }
    if (!['daily', 'telegram_subscribe', 'vk_subscribe'].includes(bonusType)) {
      return noStoreJson({ success: false, message: 'Неизвестный тип бонуса' }, { status: 400 });
    }

    const { dbUserId, user } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId || !user) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    let amount: number;
    let bonusKey: string;
    let description: string;
    let provider: string | null = null;
    let externalSubject: string | null = null;
    let verificationData: Record<string, unknown> = {};

    if (bonusType === 'daily') {
      const day = utcDayKey();
      amount = pickDailyWheelAmount();
      bonusKey = `daily:${day}`;
      description = `Ежедневный бонус ${day}`;
      verificationData = { day, source: 'server_daily_wheel' };
    } else {
      const socialType = bonusType as SocialBonusType;
      const verification = await verifySocialSubscription(socialType, user);
      if (!verification.configured) {
        return noStoreJson(
          { success: false, code: 'BONUS_NOT_CONFIGURED', message: verification.error },
          { status: 503 }
        );
      }
      if (!verification.ok) {
        return noStoreJson(
          { success: false, code: 'SUBSCRIPTION_NOT_FOUND', message: verification.error },
          { status: 403 }
        );
      }

      amount = 300;
      bonusKey = socialType;
      provider = verification.provider;
      externalSubject = verification.subjectId || null;
      verificationData = verification.details || {};
      description =
        socialType === 'telegram_subscribe'
          ? 'Бонус за подписку в Telegram'
          : 'Бонус за подписку в ВК';
    }

    const { data, error } = await supabaseAdmin.rpc('claim_pidr_bonus', {
      p_user_id: dbUserId,
      p_bonus_key: bonusKey,
      p_bonus_type: bonusType,
      p_amount: amount,
      p_description: description,
      p_provider: provider,
      p_external_subject: externalSubject,
      p_verification_data: verificationData,
    });

    if (error) {
      if (isDuplicateClaim(error)) {
        const daily = bonusType === 'daily';
        return noStoreJson(
          {
            success: false,
            code: 'BONUS_ALREADY_CLAIMED',
            message: daily ? 'Ежедневный бонус уже получен сегодня.' : 'Этот бонус уже получен.',
            data: daily ? { cooldownUntil: nextUtcDay() } : undefined,
          },
          { status: 409 }
        );
      }
      if (migrationMissing(error)) {
        return noStoreJson(
          {
            success: false,
            code: 'BONUS_DB_MIGRATION_REQUIRED',
            message: 'Таблица безопасных бонусов ещё не установлена.',
            hint: 'Выполните scripts/sql/bonus-claims.sql в Supabase SQL Editor.',
          },
          { status: 503 }
        );
      }
      console.error('❌ [Bonus claim]', error);
      return noStoreJson({ success: false, message: 'Не удалось начислить бонус' }, { status: 500 });
    }

    const result = Array.isArray(data) ? data[0] : data;
    const newBalance = Number(result?.new_balance);
    return noStoreJson({
      success: true,
      message: `${description}: +${amount} монет`,
      data: {
        bonusAmount: amount,
        newBalance,
        oldBalance: newBalance - amount,
        bonusType,
        description,
        claimId: result?.claim_id,
      },
    });
  } catch (error) {
    console.error('❌ [POST /api/bonus]', error);
    return noStoreJson(
      { success: false, message: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStoreJson(
      { success: false, message: auth.error || 'Требуется авторизация' },
      { status: 401 }
    );
  }

  try {
    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { data: claims, error: claimsError } = await supabaseAdmin
      .from('_pidr_bonus_claims')
      .select('bonus_key, bonus_type, amount, claimed_at')
      .eq('user_id', dbUserId)
      .order('claimed_at', { ascending: false });

    if (claimsError) {
      return noStoreJson(
        {
          success: false,
          code: 'BONUS_DB_MIGRATION_REQUIRED',
          message: 'Хранилище бонусов не настроено.',
          hint: 'Выполните scripts/sql/bonus-claims.sql в Supabase SQL Editor.',
        },
        { status: 503 }
      );
    }

    const rows = (claims || []) as BonusClaimRow[];
    const dailyKey = `daily:${utcDayKey()}`;
    const dailyClaim = rows.find((claim) => claim.bonus_key === dailyKey);
    const telegramClaim = rows.find((claim) => claim.bonus_key === 'telegram_subscribe');
    const vkClaim = rows.find((claim) => claim.bonus_key === 'vk_subscribe');
    const telegramConfig = socialBonusConfig('telegram_subscribe');
    const vkConfig = socialBonusConfig('vk_subscribe');

    const { count: referralCount } = await supabaseAdmin
      .from('_pidr_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', dbUserId);

    return noStoreJson({
      success: true,
      bonuses: [
        {
          id: 'daily',
          name: 'Ежедневный бонус',
          description: 'Возвращайтесь каждый день и открывайте случайную награду',
          reward: '50, 75, 100, 125, 150, 175 или 200 монет',
          icon: '📅',
          available: !dailyClaim,
          completed: Boolean(dailyClaim),
          cooldownUntil: dailyClaim ? nextUtcDay() : null,
        },
        {
          id: 'referral',
          name: 'Пригласить друга',
          description: 'Получайте награду за активных приглашённых игроков',
          reward: '500 монет за активного друга',
          icon: '👥',
          available: true,
          completed: false,
          referrals: referralCount || 0,
          note: 'Начисляется автоматически после первого ежедневного бонуса друга.',
        },
        {
          id: 'telegram_subscribe',
          name: 'Telegram-канал',
          description: 'Подпишитесь на официальный канал и подтвердите подписку',
          reward: '300 монет',
          icon: '✈️',
          available: telegramConfig.configured && !telegramClaim,
          completed: Boolean(telegramClaim),
          configured: telegramConfig.configured,
          link: telegramConfig.link,
          note: telegramConfig.configured
            ? 'Сервер проверит подписку через Telegram Bot API.'
            : 'Проверка временно недоступна: канал не настроен.',
        },
        {
          id: 'vk_subscribe',
          name: 'Сообщество ВКонтакте',
          description: 'Вступите в официальное сообщество и подтвердите подписку',
          reward: '300 монет',
          icon: 'VK',
          available: vkConfig.configured && !vkClaim,
          completed: Boolean(vkClaim),
          configured: vkConfig.configured,
          link: vkConfig.link,
          note: vkConfig.configured
            ? 'Сервер проверит участие через VK API.'
            : 'Проверка временно недоступна: группа не настроена.',
        },
        {
          id: 'rank_up',
          name: 'Награда за ранг',
          description: 'Начисляется автоматически за достижение нового ранга',
          reward: '500–2000 монет',
          icon: '🏆',
          available: false,
          completed: false,
          nextRank: 'Серебро',
          note: 'Ручное получение отключено для защиты от повторных начислений.',
        },
      ],
    });
  } catch (error) {
    console.error('❌ [GET /api/bonus]', error);
    return noStoreJson({ success: false, message: 'Ошибка получения бонусов' }, { status: 500 });
  }
}
