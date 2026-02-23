import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 🎴 API: Замена карты в колоде
 * POST /api/nft/replace-deck-card
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Авторизация через cookie → Redis/БД
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден в БД' }, { status: 404 });
    }

    const body = await request.json();
    const { existingCardId, newCardId, suit, rank, image_url } = body;

    console.log(`🔄 [replace-deck-card] Замена карты в колоде: ${existingCardId} → ${newCardId}`);

    // Обновляем существующую запись
    const { error: updateError } = await supabase
      .from('_pidr_user_nft_deck')
      .update({
        nft_card_id: newCardId,
        image_url: image_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCardId)
      .eq('user_id', userId); // ✅ Проверяем владельца

    if (updateError) {
      console.error('❌ Ошибка замены карты в колоде:', updateError);
      return NextResponse.json(
        { success: false, error: 'Ошибка замены карты' },
        { status: 500 }
      );
    }

    console.log('✅ Карта заменена в игровой колоде');

    return NextResponse.json({
      success: true,
      message: 'Карта заменена в игровой колоде'
    });

  } catch (error: any) {
    console.error('❌ [replace-deck-card] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

