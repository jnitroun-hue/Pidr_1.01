import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { searchParams } = new URL(request.url);
    
    // Параметры запроса
    const sort = searchParams.get('sort') || 'newest';
    const filter = searchParams.get('filter') || 'all';
    const suit = searchParams.get('suit');
    const rarity = searchParams.get('rarity');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    console.log('📋 [Marketplace List] Параметры:', { sort, filter, suit, rarity, limit, offset });
    
    // ✅ Базовый запрос С ПРОДАВЦОМ
    let query = supabase
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
    
    // Фильтр по типу оплаты
    if (filter === 'coins') {
      query = query.not('price_coins', 'is', null);
    } else if (filter === 'crypto') {
      // ✅ ИСПРАВЛЕНО: Правильный синтаксис для .or()
      query = query.or('price_ton.not.is.null,price_sol.not.is.null');
    }
    
    // ✅ ОТЛАДКА: Убираем лимит на foreign key (может быть NULL)
    // Если foreign key не настроен, просто загружаем все поля
    
    // Сортировка
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
        query = query.order('views_count', { ascending: false });
        break;
    }
    
    // Пагинация
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ [Marketplace List] Ошибка загрузки:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
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
    
    console.log(`✅ [Marketplace List] Найдено ${filteredData.length} лотов`);
    
    return NextResponse.json({
      success: true,
      listings: filteredData,
      total: filteredData.length,
      limit,
      offset
    });
    
  } catch (error: any) {
    console.error('❌ [Marketplace List] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

