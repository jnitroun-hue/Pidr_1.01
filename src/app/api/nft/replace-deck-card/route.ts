import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 🎴 API: Замена карты в колоде
 * 
 * POST /api/nft/replace-deck-card
 * 
 * Body: {
 *   existingCardId: number, // ID записи в _pidr_user_nft_deck
 *   newCardId: number, // ID новой NFT карты
 *   suit: string,
 *   rank: string,
 *   image_url: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { existingCardId, newCardId, suit, rank, image_url } = body;

    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Telegram ID отсутствует' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramIdHeader, 10);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

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

