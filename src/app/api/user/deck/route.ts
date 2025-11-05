import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// 🎴 API: Получение игровой колоды пользователя

export async function GET(request: NextRequest) {
  try {
    // ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const telegramId = auth.userId as string;
    const userId = parseInt(telegramId, 10);

    console.log(`🎴 [GET DECK] Получение колоды для пользователя ${userId}`);

    // ПОЛУЧАЕМ ВСЕ КАРТЫ ИЗ КОЛОДЫ
    const { data: deckCards, error } = await supabase
      .from('_pidr_user_nft_deck')
      .select(`
        *,
        nft_card:_pidr_nft_cards(
          id,
          suit,
          rank,
          rarity,
          image_url,
          metadata
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [GET DECK] Ошибка получения колоды:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log(`✅ [GET DECK] Найдено ${deckCards?.length || 0} карт в колоде`);

    // ФОРМИРУЕМ ОТВЕТ
    const deck = deckCards?.map((card: any) => ({
      id: card.id,
      user_id: card.user_id,
      nft_card_id: card.nft_card_id,
      suit: card.suit,
      rank: card.rank,
      image_url: card.image_url,
      created_at: card.created_at,
      nft_card: card.nft_card
    })) || [];

    return NextResponse.json({
      success: true,
      deck,
      total: deck.length
    });

  } catch (error: any) {
    console.error('❌ [GET DECK] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// 🗑️ DELETE: Удалить карту из колоды
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const telegramId = auth.userId as string;
    const userId = parseInt(telegramId, 10);
    const body = await request.json();
    const { deckCardId } = body; // ID записи в _pidr_user_nft_deck

    if (!deckCardId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Deck card ID обязателен' 
      }, { status: 400 });
    }

    console.log(`🗑️ [DELETE FROM DECK] Удаление карты ${deckCardId} из колоды пользователя ${userId}`);

    // УДАЛЯЕМ КАРТУ ИЗ КОЛОДЫ
    const { error } = await supabase
      .from('_pidr_user_nft_deck')
      .delete()
      .eq('id', deckCardId)
      .eq('user_id', userId); // Проверяем владельца!

    if (error) {
      console.error('❌ [DELETE FROM DECK] Ошибка:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log(`✅ [DELETE FROM DECK] Карта ${deckCardId} удалена из колоды`);

    return NextResponse.json({
      success: true,
      message: 'Карта удалена из колоды'
    });

  } catch (error: any) {
    console.error('❌ [DELETE FROM DECK] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

