import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/marketplace/my-sales
 * 
 * Получить мои активные лоты и историю продаж
 * 
 * Headers:
 * - x-telegram-id: telegram user ID
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }
    
    const userId = parseInt(telegramIdHeader, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат telegram_id' },
        { status: 400 }
      );
    }
    
    console.log('📊 [Marketplace My Sales] Загрузка для пользователя:', userId);
    
    // Активные лоты
    const { data: activeListings, error: activeError } = await supabase
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
        )
      `)
      .eq('seller_user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (activeError) {
      console.error('❌ [Marketplace My Sales] Ошибка загрузки активных:', activeError);
    }
    
    // Проданные карты
    const { data: soldListings, error: soldError } = await supabase
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
        buyer:_pidr_users!_pidr_nft_marketplace_buyer_user_id_fkey(
          telegram_id,
          username,
          first_name
        )
      `)
      .eq('seller_user_id', userId)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })
      .limit(20);
    
    if (soldError) {
      console.error('❌ [Marketplace My Sales] Ошибка загрузки проданных:', soldError);
    }
    
    console.log(`✅ [Marketplace My Sales] Активных: ${activeListings?.length || 0}, Проданных: ${soldListings?.length || 0}`);
    
    return NextResponse.json({
      success: true,
      active: activeListings || [],
      sold: soldListings || []
    });
    
  } catch (error: any) {
    console.error('❌ [Marketplace My Sales] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

