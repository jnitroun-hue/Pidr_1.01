/**
 * 📊 API: Статистика рефералов
 * 
 * GET /api/referral/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [referral/stats] Получение статистики рефералов');

    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const auth = requireAuth(request);

    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.rpc('get_referral_stats', {
      p_user_id: dbUserId
    });

    if (!error && data) {
      return NextResponse.json({
        success: true,
        stats: data
      });
    }

    const { count } = await supabase
      .from('_pidr_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', dbUserId);

    const { data: bonusRows } = await supabase
      .from('_pidr_referral_bonuses')
      .select('referrer_bonus')
      .eq('referrer_id', dbUserId);

    const totalBonus = (bonusRows || []).reduce(
      (sum: number, row: { referrer_bonus?: number }) => sum + Number(row.referrer_bonus || 0),
      0
    );

    return NextResponse.json({
      success: true,
      stats: {
        referral_code: String(dbUserId),
        referral_count: count || 0,
        total_bonus_earned: totalBonus,
        referrals: [],
      }
    });

  } catch (error: any) {
    console.error('❌ [referral/stats] Критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

