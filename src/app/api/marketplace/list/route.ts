import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/list
 * 
 * Получить список активных NFT лотов на маркетплейсе
 * 
 * Query параметры:
 * - sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular'
 * - filter: 'all' | 'coins' | 'crypto'
 * - suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | null
 * - rarity: 'pokemon' | 'simple' | null
 * - limit: число (default 50)
 * - offset: число (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    if (!db) {
      return NextResponse.json({ success: false, error: 'База данных недоступна' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    
    // Параметры запроса
    const sort = searchParams.get('sort') || 'newest';
    const filter = searchParams.get('filter') || 'all';
    const suit = searchParams.get('suit');
    const rarity = searchParams.get('rarity');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    console.log('📋 [Marketplace List] Параметры:', { sort, filter, suit, rarity, limit, offset });
    
    const applyFilterSortAndRange = (query: any, useLegacyPopularFallback = false) => {
      if (filter === 'coins') {
        query = query.not('price_coins', 'is', null);
      } else if (filter === 'crypto') {
        query = query.or('price_ton.not.is.null,price_sol.not.is.null');
      }

      switch (sort) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_asc':
          query = query.order('price_coins', { ascending: true, nullsFirst: false });
          break;
        case 'price_desc':
          query = query.order('price_coins', { ascending: false, nullsFirst: false });
          break;
        case 'popular':
          query = useLegacyPopularFallback
            ? query.order('created_at', { ascending: false })
            : query.order('views_count', { ascending: false });
          break;
      }

      return query.range(offset, offset + limit - 1);
    };

    const isSchemaCompatError = (msg: string) =>
      msg.includes('fiat_payment_method') ||
      msg.includes('price_rub') ||
      msg.includes('views_count') ||
      msg.includes('schema cache');

    let query = db
      .from('_pidr_nft_marketplace')
      .select(`
        *,
        nft_card:_pidr_nft_cards(
          id,
          suit,
          rank,
          rarity,
          image_url,
          metadata
        ),
        seller:_pidr_users!seller_user_id(
          telegram_id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('status', 'active');

    query = applyFilterSortAndRange(query, false);

    let { data, error } = await query;
    
    if (error) {
      console.error('❌ [Marketplace List] Ошибка загрузки:', error);
      const msg = String(error.message || '');

      if (isSchemaCompatError(msg)) {
        // Fallback для старой схемы БД: возвращаем лоты без новых колонок и без зависимостей на schema cache.
        console.warn('⚠️ [Marketplace List] Переходим в legacy fallback из-за схемы:', msg);

        let fallbackQuery = db
          .from('_pidr_nft_marketplace')
          .select('id,nft_card_id,seller_user_id,price_coins,price_ton,price_sol,crypto_currency,status,created_at')
          .eq('status', 'active');

        fallbackQuery = applyFilterSortAndRange(fallbackQuery, true);
        const fallbackResult = await fallbackQuery;

        if (fallbackResult.error) {
          console.error('❌ [Marketplace List] Fallback тоже упал:', fallbackResult.error);
          return NextResponse.json(
            { success: false, error: fallbackResult.error.message },
            { status: 500 }
          );
        }

        const fallbackRows = fallbackResult.data || [];
        const nftIds = Array.from(new Set(fallbackRows.map((row: any) => row.nft_card_id).filter(Boolean)));
        const sellerIds = Array.from(new Set(fallbackRows.map((row: any) => row.seller_user_id).filter(Boolean)));

        let cardsById = new Map<number, any>();
        let sellersById = new Map<number, any>();

        if (nftIds.length > 0) {
          const { data: cards } = await db
            .from('_pidr_nft_cards')
            .select('id,suit,rank,rarity,image_url,metadata')
            .in('id', nftIds);
          cardsById = new Map((cards || []).map((card: any) => [card.id, card]));
        }

        if (sellerIds.length > 0) {
          const { data: sellers } = await db
            .from('_pidr_users')
            .select('id,telegram_id,username,first_name,last_name')
            .in('id', sellerIds);
          sellersById = new Map((sellers || []).map((seller: any) => [seller.id, seller]));
        }

        data = fallbackRows.map((row: any) => ({
          ...row,
          views_count: 0,
          price_rub: null,
          fiat_payment_method: null,
          nft_card: cardsById.get(row.nft_card_id) || null,
          seller: sellersById.get(row.seller_user_id)
            ? {
                telegram_id: sellersById.get(row.seller_user_id).telegram_id,
                username: sellersById.get(row.seller_user_id).username,
                first_name: sellersById.get(row.seller_user_id).first_name,
                last_name: sellersById.get(row.seller_user_id).last_name,
              }
            : null,
        }));
      } else {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }
    
    // Фильтрация по масти и редкости (на уровне приложения)
    let filteredData = data || [];
    
    if (suit) {
      filteredData = filteredData.filter((item: any) => 
        item.nft_card?.suit === suit
      );
    }

    if (rarity) {
      filteredData = filteredData.filter((item: any) => 
        item.nft_card?.rarity === rarity
      );
    }

    // Только лоты с карточкой и картинкой (иначе в магазине пустой слот)
    filteredData = filteredData.filter(
      (item: any) => item.nft_card?.id && item.nft_card?.image_url
    );
    
    console.log(`✅ [Marketplace List] Найдено ${filteredData.length} лотов`);
    
    const response = NextResponse.json({
      success: true,
      listings: filteredData,
      total: filteredData.length,
      limit,
      offset
    });
    
    // ✅ УСТАНАВЛИВАЕМ ЗАГОЛОВКИ ДЛЯ ОТКЛЮЧЕНИЯ КЭШИРОВАНИЯ
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error: any) {
    console.error('❌ [Marketplace List] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

