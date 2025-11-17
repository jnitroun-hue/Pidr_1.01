import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth/session-utils';

/**
 * GET /api/nft/collection
 * Получить NFT коллекцию пользователя
 */
export async function GET(req: NextRequest) {
  try {
    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [collection] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = telegramIdHeader;
    const userIdBigInt = parseInt(userId, 10); // ✅ Конвертируем в BIGINT
    console.log(`📦 Получаем NFT коллекцию пользователя ${userId} (${userIdBigInt}) через headers...`);

    // ✅ ПОЛУЧАЕМ ID КАРТ, КОТОРЫЕ ВЫСТАВЛЕНЫ НА ПРОДАЖУ
    const { data: activeListings } = await supabase
      .from('_pidr_nft_marketplace')
      .select('nft_card_id')
      .eq('seller_user_id', userIdBigInt)
      .eq('status', 'active');
    
    const listedCardIds = (activeListings || []).map((listing: any) => listing.nft_card_id);
    console.log(`🛒 [collection] Карты на продаже (${listedCardIds.length}):`, listedCardIds);

    // ✅ ПОЛУЧАЕМ ID КАРТ, КОТОРЫЕ УЖЕ В КОЛОДЕ
    const { data: deckCards } = await supabase
      .from('_pidr_user_nft_deck')
      .select('nft_card_id')
      .eq('user_id', userIdBigInt);
    
    const deckCardIds = (deckCards || []).map((deckCard: any) => deckCard.nft_card_id);
    console.log(`🎴 [collection] Карты в колоде (${deckCardIds.length}):`, deckCardIds);

    // ✅ ПРЯМОЙ ЗАПРОС к таблице _pidr_nft_cards (ИСКЛЮЧАЕМ КАРТЫ НА ПРОДАЖЕ И В КОЛОДЕ!)
    let query = supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('user_id', userIdBigInt)
      .order('created_at', { ascending: false });
    
    // ✅ ФИЛЬТРУЕМ: Убираем карты, которые на продаже
    if (listedCardIds.length > 0) {
      query = query.not('id', 'in', `(${listedCardIds.join(',')})`);
    }
    
    // ✅ ФИЛЬТРУЕМ: Убираем карты, которые в колоде
    if (deckCardIds.length > 0) {
      query = query.not('id', 'in', `(${deckCardIds.join(',')})`);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('❌ Ошибка получения коллекции:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка получения коллекции', details: error.message },
        { status: 500 }
      );
    }

    const collection = data || [];
    console.log(`✅ Найдено ${collection.length} NFT карт для пользователя ${userId} (исключая ${listedCardIds.length} карт на продаже и ${deckCardIds.length} карт в колоде)`);

    return NextResponse.json({
      success: true,
      collection,
      total: collection.length
    });

  } catch (error: any) {
    console.error('❌ Ошибка API получения коллекции:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

