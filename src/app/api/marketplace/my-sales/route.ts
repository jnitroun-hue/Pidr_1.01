import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
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

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    console.log('📊 [Marketplace My Sales] Загрузка для пользователя:', dbUserId);
    
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
      .eq('seller_user_id', dbUserId)
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
      .eq('seller_user_id', dbUserId)
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

