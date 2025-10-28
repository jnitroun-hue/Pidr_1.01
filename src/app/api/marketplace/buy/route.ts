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
 * POST /api/marketplace/buy
 * 
 * Купить NFT карту с маркетплейса
 * 
 * Body:
 * {
 *   listing_id: number,
 *   payment_method: 'coins' | 'crypto'
 * }
 * 
 * Headers:
 * - x-telegram-id: telegram user ID
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Получаем пользователя
    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }
    
    const buyerId = parseInt(telegramIdHeader, 10);
    
    if (isNaN(buyerId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат telegram_id' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { listing_id, payment_method } = body;
    
    console.log('💰 [Marketplace Buy] Покупка:', { buyerId, listing_id, payment_method });
    
    // Валидация
    if (!listing_id || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'listing_id и payment_method обязательны' },
        { status: 400 }
      );
    }
    
    // Получаем лот
    const { data: listing, error: listingError } = await supabase
      .from('_pidr_nft_marketplace')
      .select(`
        *,
        nft_card:_pidr_nft_cards(*)
      `)
      .eq('id', listing_id)
      .single();
    
    if (listingError || !listing) {
      console.error('❌ [Marketplace Buy] Лот не найден:', listingError);
      return NextResponse.json(
        { success: false, error: 'Лот не найден' },
        { status: 404 }
      );
    }
    
    // Проверки
    if (listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Лот неактивен' },
        { status: 400 }
      );
    }
    
    if (listing.seller_user_id === buyerId) {
      return NextResponse.json(
        { success: false, error: 'Нельзя купить собственную карту' },
        { status: 400 }
      );
    }
    
    // Проверяем доступность оплаты
    const price = payment_method === 'coins' ? listing.price_coins : listing.price_crypto;
    
    if (!price) {
      return NextResponse.json(
        { success: false, error: `Этот лот недоступен для оплаты ${payment_method}` },
        { status: 400 }
      );
    }
    
    // Получаем баланс покупателя
    const { data: buyer, error: buyerError } = await supabase
      .from('_pidr_users')
      .select('telegram_id, coins')
      .eq('telegram_id', buyerId)
      .single();
    
    if (buyerError || !buyer) {
      console.error('❌ [Marketplace Buy] Покупатель не найден:', buyerError);
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    // Проверяем баланс (только для coins)
    if (payment_method === 'coins') {
      if (buyer.coins < price) {
        return NextResponse.json(
          { success: false, error: `Недостаточно монет. Требуется: ${price}, есть: ${buyer.coins}` },
          { status: 400 }
        );
      }
    }
    
    // Начинаем транзакцию
    // 1. Списываем монеты у покупателя
    if (payment_method === 'coins') {
      const { error: deductError } = await supabase
        .from('_pidr_users')
        .update({ coins: buyer.coins - price })
        .eq('telegram_id', buyerId);
      
      if (deductError) {
        console.error('❌ [Marketplace Buy] Ошибка списания монет:', deductError);
        return NextResponse.json(
          { success: false, error: 'Ошибка списания монет' },
          { status: 500 }
        );
      }
    }
    
    // 2. Начисляем монеты продавцу (минус 5% комиссия)
    const platformFee = Math.floor(price * 0.05);
    const sellerAmount = price - platformFee;
    
    if (payment_method === 'coins') {
      const { data: seller } = await supabase
        .from('_pidr_users')
        .select('coins')
        .eq('telegram_id', listing.seller_user_id)
        .single();
      
      if (seller) {
        await supabase
          .from('_pidr_users')
          .update({ coins: seller.coins + sellerAmount })
          .eq('telegram_id', listing.seller_user_id);
      }
    }
    
    // 3. Переносим NFT к покупателю
    const { error: transferError } = await supabase
      .from('_pidr_nft_cards')
      .update({ user_id: buyerId })
      .eq('id', listing.nft_card_id);
    
    if (transferError) {
      console.error('❌ [Marketplace Buy] Ошибка переноса NFT:', transferError);
      // Откатываем монеты
      if (payment_method === 'coins') {
        await supabase
          .from('_pidr_users')
          .update({ coins: buyer.coins })
          .eq('telegram_id', buyerId);
      }
      return NextResponse.json(
        { success: false, error: 'Ошибка переноса NFT' },
        { status: 500 }
      );
    }
    
    // 4. Обновляем статус лота
    const { error: updateError } = await supabase
      .from('_pidr_nft_marketplace')
      .update({
        status: 'sold',
        buyer_user_id: buyerId,
        sold_at: new Date().toISOString()
      })
      .eq('id', listing_id);
    
    if (updateError) {
      console.error('❌ [Marketplace Buy] Ошибка обновления лота:', updateError);
    }
    
    // 5. Создаем запись транзакции
    await supabase
      .from('_pidr_marketplace_transactions')
      .insert({
        marketplace_listing_id: listing_id,
        seller_user_id: listing.seller_user_id,
        buyer_user_id: buyerId,
        nft_card_id: listing.nft_card_id,
        transaction_type: payment_method,
        amount_coins: payment_method === 'coins' ? price : null,
        amount_crypto: payment_method === 'crypto' ? price : null,
        crypto_currency: payment_method === 'crypto' ? listing.crypto_currency : null,
        platform_fee_coins: payment_method === 'coins' ? platformFee : null,
        platform_fee_crypto: payment_method === 'crypto' ? (price * 0.05) : null,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    
    console.log('✅ [Marketplace Buy] Покупка завершена!');
    
    return NextResponse.json({
      success: true,
      message: 'NFT успешно куплена!',
      nft_card: listing.nft_card,
      paid: price,
      platform_fee: platformFee
    });
    
  } catch (error: any) {
    console.error('❌ [Marketplace Buy] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

