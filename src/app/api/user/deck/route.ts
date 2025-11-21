import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 🎴 API: Получение игровой колоды пользователя

export async function GET(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: Используем headers напрямую, как в /api/nft/collection
    const telegramIdHeader = request.headers.get('x-telegram-id');
    const usernameHeader = request.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [GET DECK] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramIdHeader, 10);
    
    if (isNaN(userId)) {
      console.error('❌ [GET DECK] Некорректный telegram_id:', telegramIdHeader);
      return NextResponse.json(
        { success: false, message: 'Некорректный ID пользователя' },
        { status: 400 }
      );
    }

    console.log(`🎴 [GET DECK] Получение колоды для пользователя ${userId} через headers...`);

    // ПОЛУЧАЕМ ВСЕ КАРТЫ ИЗ КОЛОДЫ
    // ✅ ИСПРАВЛЕНО: Используем явное указание foreign key через !nft_card_id
    const { data: deckCards, error } = await supabase
      .from('_pidr_user_nft_deck')
      .select(`
        *,
        nft_card:_pidr_nft_cards!nft_card_id(
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
    // ✅ ИСПРАВЛЕНО: Используем данные из nft_card если есть, иначе из deck
    const deck = deckCards?.map((card: any) => {
      const nftCard = card.nft_card || null;
      return {
        id: card.id,
        user_id: card.user_id,
        nft_card_id: card.nft_card_id,
        suit: nftCard?.suit || card.suit,
        rank: nftCard?.rank || card.rank,
        rarity: nftCard?.rarity || 'common',
        image_url: nftCard?.image_url || card.image_url,
        metadata: nftCard?.metadata || null,
        created_at: card.created_at,
        nft_card: nftCard
      };
    }) || [];

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
    // ✅ ИСПРАВЛЕНО: Используем headers напрямую
    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      console.error('❌ [DELETE DECK] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramIdHeader, 10);
    
    if (isNaN(userId)) {
      console.error('❌ [DELETE DECK] Некорректный telegram_id:', telegramIdHeader);
      return NextResponse.json(
        { success: false, message: 'Некорректный ID пользователя' },
        { status: 400 }
      );
    }
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

