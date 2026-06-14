/**
 * 🎁 API: Применение реферального кода
 * POST /api/referral/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import {
  applyReferralForNewUser,
  authEnvironmentToReferralMethod,
} from '@/lib/referral/apply-referral';
import { PENDING_REFERRAL_COOKIE } from '@/lib/referral/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, authMethod: bodyAuthMethod } = body;

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const code =
      referralCode ||
      request.cookies.get(PENDING_REFERRAL_COOKIE)?.value;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Referral code is required' },
        { status: 400 }
      );
    }

    const authMethod =
      (bodyAuthMethod as string | undefined) ||
      authEnvironmentToReferralMethod(auth.environment);

    const result = await applyReferralForNewUser(supabaseAdmin, {
      referredUserId: dbUserId,
      referralCode: String(code),
      authMethod: authMethod as 'web' | 'telegram' | 'vk' | 'google' | 'email' | 'apple' | 'unknown',
      grantBonuses: false,
    });

    if (!result.success && !result.alreadyLinked) {
      return NextResponse.json(
        { success: false, error: result.error || 'Referral failed' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      alreadyLinked: result.alreadyLinked,
      referrerId: result.referrerId,
      message: result.alreadyLinked
        ? 'Referral already applied'
        : 'Referral linked successfully',
    });
    response.cookies.set(PENDING_REFERRAL_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  } catch (error: unknown) {
    console.error('❌ [referral/apply] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
