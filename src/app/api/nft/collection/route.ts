import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/nft/collection
 * Получить NFT коллекцию пользователя
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ Авторизация через cookie → Redis/БД
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userIdBigInt } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userIdBigInt) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден в БД' }, { status: 404 });
    }

    console.log(`📦 Получаем NFT коллекцию пользователя id=${userIdBigInt}...`);

    // ✅ ПОЛУЧАЕМ ID КАРТ, КОТОРЫЕ ВЫСТАВЛЕНЫ НА ПРОДАЖУ
    const { data: activeListings } = await supabase
      .from('_pidr_nft_marketplace')
      .select('nft_card_id')
      .eq('seller_user_id', userIdBigInt)
      .eq('status', 'active');
    
    const listedCardIds = (activeListings || []).map((listing: any) => listing.nft_card_id);

    // ✅ ПОЛУЧАЕМ ID КАРТ, КОТОРЫЕ УЖЕ В КОЛОДЕ
    const { data: deckCards } = await supabase
      .from('_pidr_user_nft_deck')
      .select('nft_card_id')
      .eq('user_id', userIdBigInt);
    
    const deckCardIds = (deckCards || []).map((deckCard: any) => deckCard.nft_card_id);

    // ✅ ПРЯМОЙ ЗАПРОС к таблице _pidr_nft_cards (ИСКЛЮЧАЕМ КАРТЫ НА ПРОДАЖЕ И В КОЛОДЕ!)
    let query = supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('user_id', userIdBigInt)
      .order('created_at', { ascending: false });
    
    if (listedCardIds.length > 0) {
      query = query.not('id', 'in', `(${listedCardIds.join(',')})`);
    }
    
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
    console.log(`✅ Найдено ${collection.length} NFT карт (исключая ${listedCardIds.length} на продаже и ${deckCardIds.length} в колоде)`);

    const response = NextResponse.json({
      success: true,
      collection,
      total: collection.length
    });
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error: any) {
    console.error('❌ Ошибка API получения коллекции:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
