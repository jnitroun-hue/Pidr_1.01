import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return noStoreJson({ success: false, message: auth.error }, { status: 401 });
    }

    const { userId, environment } = auth;
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId!, environment!);

    if (!dbUserId || !dbUser) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { experience, coins, ratingChange } = await req.json();

    console.log(`🏆 [POST /api/user/rewards] Обновляем награды для ${userId} (db: ${dbUserId}):`, {
      experience, coins, ratingChange
    });

    const newCoins = (dbUser.coins || 0) + (coins || 0);
    const newExperience = (dbUser.experience || 0) + (experience || 0);
    const newRating = (dbUser.rating || 1000) + (ratingChange || 0);

    const { error: updateError } = await supabaseAdmin
      .from('_pidr_users')
      .update({
        coins: Math.max(0, newCoins),
        experience: Math.max(0, newExperience),
        rating: Math.max(0, newRating)
      })
      .eq('id', dbUserId);

    if (updateError) {
      console.error('❌ Ошибка обновления наград:', updateError);
      return noStoreJson({ success: false, message: updateError.message }, { status: 500 });
    }

    if ((coins || 0) !== 0) {
      const { error: txError } = await supabaseAdmin
        .from('_pidr_coin_transactions')
        .insert({
          user_id: dbUserId,
          transaction_type: 'game_rewards',
          amount: coins || 0,
          description: 'Начисление игровых наград',
          balance_before: dbUser.coins || 0,
          balance_after: Math.max(0, newCoins),
          created_at: new Date().toISOString()
        });
      if (txError) {
        console.warn('⚠️ [POST /api/user/rewards] Не удалось записать транзакцию награды:', txError.message);
      }
    }

    return noStoreJson({
      success: true,
      rewards: { coins: newCoins, experience: newExperience, rating: newRating }
    });

  } catch (error: unknown) {
    console.error('❌ User rewards POST error:', error);
    return noStoreJson({ success: false, message: error instanceof Error ? error.message : 'Ошибка сервера' }, { status: 500 });
  }
}
