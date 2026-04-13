import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

/**
 * POST /api/marketplace/create
 * 
 * Выставить NFT карту на продажу
 * 
 * Body:
 * {
 *   nft_card_id: number,
 *   price_coins?: number,
 *   price_ton?: number,
 *   price_sol?: number,
 *   crypto_currency?: 'TON' | 'SOL'
 * }
 * 
 * Headers:
 * - x-telegram-id: telegram user ID
 */
export async function POST(request: NextRequest) {
  try {
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
    
    // Парсим body
    const body = await request.json();
    const { nft_card_id, price_coins, price_ton, price_sol, crypto_currency } = body;
    
    console.log('🏷️ [Marketplace Create] Создание лота:', { 
      userId: dbUserId, 
      nft_card_id, 
      price_coins, 
      price_ton,
      price_sol,
      crypto_currency 
    });
    
    // Валидация
    if (!nft_card_id) {
      return NextResponse.json(
        { success: false, error: 'nft_card_id обязателен' },
        { status: 400 }
      );
    }
    
    // ✅ Проверяем price_coins, price_ton или price_sol
    if (!price_coins && !price_ton && !price_sol) {
      return NextResponse.json(
        { success: false, error: 'Укажите хотя бы одну цену (price_coins, price_ton или price_sol)' },
        { status: 400 }
      );
    }
    
    // Карта должна принадлежать текущему пользователю по внутреннему id.
    const { data: nftCard, error: nftError } = await supabase
      .from('_pidr_nft_cards')
      .select('id, user_id')
      .eq('id', nft_card_id)
      .eq('user_id', dbUserId)
      .single();
    
    if (nftError || !nftCard) {
      console.error('❌ [Marketplace Create] NFT не найден:', nftError);
      return NextResponse.json(
        { success: false, error: 'NFT карта не найдена' },
        { status: 404 }
      );
    }
    
    console.log('🔍 [Marketplace Create] Проверка владельца:', {
      cardUserId: nftCard.user_id,
      requestUserId: dbUserId,
      match: nftCard.user_id === dbUserId
    });

    console.log('✅ [Marketplace Create] Карта принадлежит пользователю');
    
    // Проверяем что карта еще не выставлена на продажу
    const { data: existingListing } = await supabase
      .from('_pidr_nft_marketplace')
      .select('id')
      .eq('nft_card_id', nft_card_id)
      .eq('status', 'active')
      .single();
    
    if (existingListing) {
      return NextResponse.json(
        { success: false, error: 'Эта карта уже выставлена на продажу' },
        { status: 400 }
      );
    }
    
    // Создаем лот
    const { data: listing, error: insertError } = await supabase
      .from('_pidr_nft_marketplace')
      .insert({
        nft_card_id,
        seller_user_id: dbUserId,
        price_coins: price_coins || null,
        price_ton: price_ton || null,
        price_sol: price_sol || null,
        crypto_currency: price_ton ? 'TON' : price_sol ? 'SOL' : null,
        status: 'active'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ [Marketplace Create] Ошибка создания лота:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }
    
    console.log('✅ [Marketplace Create] Лот создан:', listing.id);
    
    return NextResponse.json({
      success: true,
      listing
    });
    
  } catch (error: any) {
    console.error('❌ [Marketplace Create] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

