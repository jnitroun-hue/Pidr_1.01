/**
 * 🎴 API: Добавление NFT карты в игровую колоду пользователя
 * 
 * POST /api/nft/add-to-deck
 * 
 * Body: {
 *   nftId: string,
 *   suit: string,
 *   rank: string,
 *   imageUrl: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🎴 [add-to-deck] Получен запрос на добавление NFT в колоду');
    console.log('🔍 [add-to-deck] Headers:', request.headers.get('x-telegram-id'));

    // Получаем данные из запроса
    const body = await request.json();
    // ✅ ИСПРАВЛЕНО: Принимаем nft_card_id или nftId (совместимость)
    const { nft_card_id, nftId, suit, rank, image_url, imageUrl } = body;
    const cardId = nft_card_id || nftId;
    const cardImageUrl = image_url || imageUrl;

    // Получаем user_id из headers
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

    console.log(`👤 Пользователь: ${userId}`);
    console.log(`🎴 NFT ID: ${cardId}, ${rank}${suit}`);

    // ✅ СНАЧАЛА ПРОВЕРЯЕМ ВСЕ КАРТЫ ПОЛЬЗОВАТЕЛЯ
    const { data: allUserCards, error: allCardsError } = await supabase
      .from('_pidr_nft_cards')
      .select('id, user_id, suit, rank')
      .eq('user_id', userId);
    
    console.log('📋 [add-to-deck] Все карты пользователя:', allUserCards);
    console.log('📋 [add-to-deck] Количество карт:', allUserCards?.length || 0);
    
    if (allUserCards && allUserCards.length > 0) {
      console.log('🔍 [add-to-deck] Ищем карту с ID:', cardId);
      const foundCard = allUserCards.find((c: any) => c.id === cardId);
      console.log('🔍 [add-to-deck] Карта найдена в списке?', foundCard ? 'ДА' : 'НЕТ');
    }

    // ✅ ИСПРАВЛЕНО: Проверяем что карта принадлежит пользователю (user_id = telegram_id!)
    let { data: nftCard, error: nftError } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId) // user_id в _pidr_nft_cards = telegram_id
      .single();

    if (nftError) {
      console.error('❌ Ошибка запроса карты:', nftError);
      console.log('🔍 Попытка найти карту без проверки владельца...');
      
      // Пробуем найти карту без проверки владельца для отладки
      const { data: anyCard, error: anyError } = await supabase
        .from('_pidr_nft_cards')
        .select('*')
        .eq('id', cardId) // ✅ ИСПРАВЛЕНО: cardId вместо nftId
        .single();
      
      if (anyCard) {
        console.log('🔍 Карта найдена, но user_id не совпадает:', {
          cardUserId: anyCard.user_id,
          requestUserId: userId,
          match: anyCard.user_id === userId
        });
        
        // ✅ ЕСЛИ КАРТА СУЩЕСТВУЕТ - ДОБАВЛЯЕМ В КОЛОДУ (владелец уже проверен при генерации!)
        if (anyCard.user_id == userId || anyCard.user_id === userId) {
          nftCard = anyCard;
          console.log('✅ Карта принадлежит пользователю, продолжаем...');
        } else {
          return NextResponse.json(
            { success: false, error: 'Эта карта вам не принадлежит' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Карта не найдена' },
          { status: 404 }
        );
      }
    }

    if (!nftCard) {
      return NextResponse.json(
        { success: false, error: 'Карта не найдена' },
        { status: 404 }
      );
    }
    
    console.log('✅ Карта найдена и принадлежит пользователю');

    // Проверяем существует ли уже запись в _pidr_user_nft_deck
    const { data: existing, error: checkError } = await supabase
      .from('_pidr_user_nft_deck')
      .select('*')
      .eq('user_id', userId)
      .eq('suit', suit)
      .eq('rank', rank)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Ошибка проверки существующей карты:', checkError);
    }

    if (existing) {
      // Обновляем существующую запись
      const { error: updateError } = await supabase
        .from('_pidr_user_nft_deck')
        .update({
          nft_card_id: cardId, // ✅ ИСПРАВЛЕНО: cardId вместо nftId
          image_url: cardImageUrl, // ✅ ИСПРАВЛЕНО: cardImageUrl вместо imageUrl
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Ошибка обновления карты в колоде:', updateError);
        return NextResponse.json(
          { success: false, error: 'Ошибка обновления карты' },
          { status: 500 }
        );
      }

      console.log('✅ Карта обновлена в игровой колоде');
    } else {
      // Создаем новую запись
      const { error: insertError } = await supabase
        .from('_pidr_user_nft_deck')
        .insert({
          user_id: userId,
          nft_card_id: cardId, // ✅ ИСПРАВЛЕНО: cardId вместо nftId
          suit,
          rank,
          image_url: cardImageUrl, // ✅ ИСПРАВЛЕНО: cardImageUrl вместо imageUrl
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Ошибка добавления карты в колоду:', insertError);
        return NextResponse.json(
          { success: false, error: 'Ошибка добавления карты' },
          { status: 500 }
        );
      }

      console.log('✅ Карта добавлена в игровую колоду');
    }

    return NextResponse.json({
      success: true,
      message: 'Карта добавлена в игровую колоду'
    });

  } catch (error: any) {
    console.error('❌ [add-to-deck] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

