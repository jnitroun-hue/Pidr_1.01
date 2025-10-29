import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/marketplace/create
 * 
 * Выставить NFT карту на продажу
 * 
 * Body:
 * {
 *   nft_card_id: number,
 *   price_coins?: number,
 *   price_crypto?: number,
 *   crypto_currency?: 'TON' | 'SOL' | 'USDT'
 * }
 * 
 * Headers:
 * - x-telegram-id: telegram user ID
 */
export async function POST(request: NextRequest) {
  try {
    // Получаем пользователя из headers
    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован. Требуется x-telegram-id header' },
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
    
    // Парсим body
    const body = await request.json();
    const { nft_card_id, price_coins, price_crypto, crypto_currency } = body;
    
    console.log('🏷️ [Marketplace Create] Создание лота:', { 
      userId, 
      nft_card_id, 
      price_coins, 
      price_crypto, 
      crypto_currency 
    });
    
    // Валидация
    if (!nft_card_id) {
      return NextResponse.json(
        { success: false, error: 'nft_card_id обязателен' },
        { status: 400 }
      );
    }
    
    if (!price_coins && !price_crypto) {
      return NextResponse.json(
        { success: false, error: 'Укажите хотя бы одну цену (price_coins или price_crypto)' },
        { status: 400 }
      );
    }
    
    if (price_crypto && !crypto_currency) {
      return NextResponse.json(
        { success: false, error: 'При указании price_crypto требуется crypto_currency' },
        { status: 400 }
      );
    }
    
    // Проверяем что NFT принадлежит пользователю
    const { data: nftCard, error: nftError } = await supabase
      .from('_pidr_nft_cards')
      .select('id, user_id')
      .eq('id', nft_card_id)
      .single();
    
    if (nftError || !nftCard) {
      console.error('❌ [Marketplace Create] NFT не найден:', nftError);
      return NextResponse.json(
        { success: false, error: 'NFT карта не найдена' },
        { status: 404 }
      );
    }
    
    if (nftCard.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Эта карта вам не принадлежит' },
        { status: 403 }
      );
    }
    
    // Проверяем что карта еще не выставлена на продажу
    const { data: existingListing } = await supabase
      .from('_pidr_nft_marketplace_listings')
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
      .from('_pidr_nft_marketplace_listings')
      .insert({
        nft_card_id,
        seller_user_id: userId,
        price_coins: price_coins || null,
        price_crypto: price_crypto || null,
        crypto_currency: crypto_currency || null,
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

