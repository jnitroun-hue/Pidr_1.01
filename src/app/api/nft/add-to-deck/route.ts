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
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🎴 [add-to-deck] Получен запрос на добавление NFT в колоду');

    // ✅ Авторизация через cookie → Redis/БД
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден в БД' }, { status: 404 });
    }

    // Получаем данные из запроса
    const body = await request.json();
    const { nft_card_id, nftId, suit, rank, image_url, imageUrl } = body;
    const cardId = nft_card_id || nftId;
    const cardImageUrl = image_url || imageUrl;

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

    // Проверяем что карта принадлежит пользователю по внутреннему id.
    let { data: nftCard, error: nftError } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
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
        
        if (anyCard.user_id === userId) {
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

    // ✅ ПРОВЕРЯЕМ СУЩЕСТВУЕТ ЛИ УЖЕ КАРТА С ТАКИМ SUIT И RANK В КОЛОДЕ
    const { data: existing, error: checkError } = await supabase
      .from('_pidr_user_nft_deck')
      .select('*, nft_card:_pidr_nft_cards(id, image_url, rarity)')
      .eq('user_id', userId)
      .eq('suit', suit.toLowerCase())
      .eq('rank', rank.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Ошибка проверки существующей карты:', checkError);
    }

    // ✅ ЕСЛИ КАРТА УЖЕ ЕСТЬ - ВОЗВРАЩАЕМ ИНФОРМАЦИЮ ДЛЯ ПОДТВЕРЖДЕНИЯ
    if (existing) {
      const existingCardInfo = existing.nft_card || {};
      return NextResponse.json({
        success: false,
        error: 'DUPLICATE_CARD', // Специальный код для дубликата
        message: `У вас уже есть карта ${rank}${suit} в колоде`,
        existingCard: {
          id: existing.id,
          nft_card_id: existing.nft_card_id,
          image_url: existing.image_url || existingCardInfo.image_url,
          rarity: existingCardInfo.rarity
        },
        newCard: {
          id: cardId,
          image_url: cardImageUrl,
          suit,
          rank
        }
      });
    }

    // ✅ КАРТЫ НЕТ - ДОБАВЛЯЕМ НОВУЮ
    const { error: insertError } = await supabase
      .from('_pidr_user_nft_deck')
      .insert({
        user_id: userId,
        nft_card_id: cardId, // ✅ ИСПРАВЛЕНО: cardId вместо nftId
        suit: suit.toLowerCase(),
        rank: rank.toLowerCase(),
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

