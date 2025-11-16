/**
 * 🪙 API: Покупка NFT в маркетплейсе за криптовалюту
 * 
 * POST /api/marketplace/buy-crypto
 * 
 * Body: {
 *   listingId: string,
 *   crypto: 'TON' | 'SOL' | 'ETH',
 *   transactionHash: string,
 *   walletAddress: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { listingId, crypto, transactionHash, walletAddress } = body;

    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const buyerId = parseInt(telegramIdHeader, 10);

    console.log(`🪙 [buy-crypto] Покупка за ${crypto}:`, {
      buyerId,
      listingId,
      transactionHash,
      walletAddress
    });

    // ✅ ПОЛУЧАЕМ ИНФОРМАЦИЮ О ЛОТЕ
    const { data: listing, error: listingError } = await supabase
      .from('_pidr_marketplace_listings')
      .select('*, nft_card:_pidr_nft_cards(*)')
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { success: false, error: 'Лот не найден или уже продан' },
        { status: 404 }
      );
    }

    const sellerId = listing.seller_id;
    const price = listing.price;

    // ✅ ПРОВЕРЯЕМ ТРАНЗАКЦИЮ (в реальности надо проверять через blockchain API)
    console.log(`✅ Транзакция ${transactionHash} подтверждена (mock)`);

    // ✅ ПЕРЕНОСИМ КАРТУ К ПОКУПАТЕЛЮ
    const { error: transferError } = await supabase
      .from('_pidr_nft_cards')
      .update({
        user_id: buyerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', listing.nft_card_id);

    if (transferError) {
      console.error('❌ Ошибка переноса карты:', transferError);
      return NextResponse.json(
        { success: false, error: 'Ошибка переноса карты' },
        { status: 500 }
      );
    }

    // ✅ ОБНОВЛЯЕМ СТАТУС ЛОТА
    const { error: updateError } = await supabase
      .from('_pidr_marketplace_listings')
      .update({
        status: 'sold',
        buyer_id: buyerId,
        sold_at: new Date().toISOString()
      })
      .eq('id', listingId);

    if (updateError) {
      console.error('❌ Ошибка обновления лота:', updateError);
    }

    // ✅ ЗАПИСЫВАЕМ ТРАНЗАКЦИЮ
    const { error: txError } = await supabase
      .from('_pidr_crypto_transactions')
      .insert({
        user_id: buyerId,
        crypto_type: crypto,
        transaction_hash: transactionHash,
        wallet_address: walletAddress,
        amount: price,
        purpose: `Marketplace Purchase: Listing #${listingId}`,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (txError) {
      console.error('❌ Ошибка записи транзакции:', txError);
    }

    // ✅ НАЧИСЛЯЕМ ПРОДАВЦУ (в реальности - отправляем крипту на кошелек)
    console.log(`💰 Продавцу ${sellerId} начислено ${price} ${crypto} (mock)`);

    return NextResponse.json({
      success: true,
      message: `Карта куплена за ${price} ${crypto}`,
      card: listing.nft_card
    });

  } catch (error: any) {
    console.error('❌ [buy-crypto] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

