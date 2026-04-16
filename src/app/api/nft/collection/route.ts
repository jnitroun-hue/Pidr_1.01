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

    // Возвращаем ПОЛНУЮ коллекцию, чтобы новые карты всегда были видны
    // в "Коллекции" и во вкладке "Мои NFT" сразу после генерации.
    const { data, error } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('user_id', userIdBigInt)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения коллекции:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка получения коллекции', details: error.message },
        { status: 500 }
      );
    }

    const listedSet = new Set((listedCardIds || []).map((id: any) => String(id)));
    const deckSet = new Set((deckCardIds || []).map((id: any) => String(id)));
    const collection = (data || []).map((card: any) => ({
      ...card,
      is_listed: listedSet.has(String(card.id)),
      is_in_deck: deckSet.has(String(card.id))
    }));
    console.log(`✅ Найдено ${collection.length} NFT карт`);

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
