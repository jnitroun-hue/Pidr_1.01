import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const { userId, environment } = auth;
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId!, environment!);

    if (!dbUserId || !dbUser) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { experience, coins, ratingChange } = await req.json();

    console.log(`🏆 [POST /api/user/rewards] Обновляем награды для ${userId} (db: ${dbUserId}):`, {
      experience, coins, ratingChange
    });

    const newCoins = (dbUser.coins || 0) + (coins || 0);
    const newExperience = (dbUser.experience || 0) + (experience || 0);
    const newRating = (dbUser.rating || 1000) + (ratingChange || 0);

    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({
        coins: Math.max(0, newCoins),
        experience: Math.max(0, newExperience),
        rating: Math.max(0, newRating)
      })
      .eq('id', dbUserId);

    if (updateError) {
      console.error('❌ Ошибка обновления наград:', updateError);
      return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rewards: { coins: newCoins, experience: newExperience, rating: newRating }
    });

  } catch (error: any) {
    console.error('❌ User rewards POST error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Ошибка сервера' }, { status: 500 });
  }
}
