import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// POST /api/user/rewards - обновить награды игрока (опыт, монеты, рейтинг)
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;
    const { experience, coins, ratingChange } = await req.json();

    console.log(`🏆 [POST /api/user/rewards] Обновляем награды для ${userId}:`, {
      experience,
      coins,
      ratingChange
    });

    // Получаем текущие данные пользователя
    const { data: currentUser, error: fetchError } = await supabase
      .from('_pidr_users')
      .select('coins, experience, rating')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Ошибка получения данных пользователя:', fetchError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения данных пользователя' 
      }, { status: 500 });
    }

    // Вычисляем новые значения
    const newCoins = (currentUser.coins || 0) + (coins || 0);
    const newExperience = (currentUser.experience || 0) + (experience || 0);
    const newRating = (currentUser.rating || 1000) + (ratingChange || 0);

    // Обновляем данные пользователя
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({
        coins: Math.max(0, newCoins), // Не может быть отрицательным
        experience: Math.max(0, newExperience),
        rating: Math.max(0, newRating)
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Ошибка обновления наград:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления наград: ' + updateError.message 
      }, { status: 500 });
    }

    console.log(`✅ [POST /api/user/rewards] Награды обновлены:`, {
      oldCoins: currentUser.coins,
      newCoins,
      oldExperience: currentUser.experience,
      newExperience,
      oldRating: currentUser.rating,
      newRating
    });

    return NextResponse.json({
      success: true,
      rewards: {
        coins: newCoins,
        experience: newExperience,
        rating: newRating
      }
    });

  } catch (error: any) {
    console.error('❌ User rewards POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}
