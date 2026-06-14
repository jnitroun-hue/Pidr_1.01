import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserIdFromDatabase, requireAuth } from '@/lib/auth-utils';
import { buildReferralLink } from '@/lib/referral/referral-links';
import {
  applyReferralForNewUser,
  authEnvironmentToReferralMethod,
} from '@/lib/referral/apply-referral';
import { PENDING_REFERRAL_COOKIE } from '@/lib/referral/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'get_code') {
      const { data, error } = await supabaseAdmin
        .from('_pidr_users')
        .select('referral_code')
        .eq('id', dbUserId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch referral code' }, { status: 500 });
      }

      return NextResponse.json({ success: true, referralCode: data?.referral_code || String(dbUserId) });
    }

    if (action === 'get_link') {
      const link = buildReferralLink(dbUserId);
      return NextResponse.json({
        success: true,
        referralLink: link,
        referralCode: String(dbUserId),
      });
    }

    if (action === 'stats') {
      const { data, error } = await supabaseAdmin.rpc('get_referral_stats', {
        p_user_id: dbUserId,
      });

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch referral stats' }, { status: 500 });
      }

      return NextResponse.json({ success: true, stats: data });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = String(body.action || '');
    const referralCode = String(body.referralCode || '');

    if (action === 'use_referral') {
      if (!referralCode) {
        return NextResponse.json({ success: false, error: 'Referral code is required' }, { status: 400 });
      }

      const authMethod =
        (body.authMethod as string | undefined) ||
        authEnvironmentToReferralMethod(auth.environment);

      const result = await applyReferralForNewUser(supabaseAdmin, {
        referredUserId: dbUserId,
        referralCode,
        authMethod: authMethod as 'web' | 'telegram' | 'vk' | 'google' | 'email' | 'apple' | 'unknown',
        grantBonuses: false,
      });

      if (!result.success && !result.alreadyLinked) {
        return NextResponse.json({ success: false, error: result.error || 'Referral apply failed' }, { status: 400 });
      }

      const response = NextResponse.json({
        success: true,
        alreadyLinked: result.alreadyLinked,
        referrerId: result.referrerId,
      });
      response.cookies.set(PENDING_REFERRAL_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }

    if (action === 'create_referral_link') {
      const referrerId = Number(body.referrerId);
      if (!referralCode || Number.isNaN(referrerId)) {
        return NextResponse.json(
          { success: false, error: 'Referral code and valid referrer ID are required' },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin.rpc('create_referral_link', {
        p_referrer_id: referrerId,
        p_referred_id: dbUserId,
        p_referral_code: referralCode,
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      if (!data?.success) {
        return NextResponse.json({ success: false, error: data?.error || 'Failed to create referral' }, { status: 400 });
      }

      return NextResponse.json({ success: true, referralId: data.referral_id });
    }

    if (action === 'get_stats') {
      const { data, error } = await supabaseAdmin.rpc('get_referral_stats', {
        p_user_id: dbUserId,
      });

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch referral stats' }, { status: 500 });
      }

      return NextResponse.json({ success: true, stats: data });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Referral POST API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}