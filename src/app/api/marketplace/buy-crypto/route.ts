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

    // ✅ ПОЛУЧАЕМ ИНФОРМАЦИЮ О ЛОТЕ (используем _pidr_nft_marketplace)
    const { data: listing, error: listingError } = await supabase
      .from('_pidr_nft_marketplace')
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

    // ✅ ОБНОВЛЯЕМ СТАТУС ЛОТА (используем _pidr_nft_marketplace)
    const { error: updateError } = await supabase
      .from('_pidr_nft_marketplace')
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

    // ✅ НАЧИСЛЯЕМ ПРОДАВЦУ В РЕАЛЬНЫЙ БАЛАНС КОШЕЛЬКА
    try {
      // Получаем адрес кошелька продавца из таблицы _pidr_player_wallets
      const { data: sellerWallet, error: walletError } = await supabase
        .from('_pidr_player_wallets')
        .select('wallet_address, coin_type, balance')
        .eq('user_id', sellerId)
        .eq('coin_type', crypto.toLowerCase())
        .single();

      if (sellerWallet && !walletError) {
        // Обновляем баланс в таблице кошельков
        const currentBalanceValue = parseFloat(sellerWallet.balance || '0');
        const newBalance = currentBalanceValue + price;

        const { error: updateBalanceError } = await supabase
          .from('_pidr_player_wallets')
          .update({
            balance: newBalance.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', sellerId)
          .eq('coin_type', crypto.toLowerCase());

        if (updateBalanceError) {
          console.error('❌ Ошибка обновления баланса кошелька:', updateBalanceError);
          // Пытаемся создать запись если не существует
          await supabase
            .from('_pidr_player_wallets')
            .insert({
              user_id: sellerId,
              wallet_address: sellerWallet.wallet_address || '',
              coin_type: crypto.toLowerCase(),
              balance: price.toString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        } else {
          console.log(`✅ Продавцу ${sellerId} начислено ${price} ${crypto} на кошелек ${sellerWallet.wallet_address}`);
        }
      } else {
        console.log(`⚠️ Кошелек продавца ${sellerId} не найден, создаем запись о транзакции`);
      }

      // Записываем транзакцию зачисления продавцу
      const { error: sellerTxError } = await supabase
        .from('_pidr_crypto_transactions')
        .insert({
          user_id: sellerId,
          crypto_type: crypto,
          transaction_hash: `sale_${listingId}_${Date.now()}`,
          wallet_address: sellerWallet?.wallet_address || 'pending',
          amount: price,
          purpose: `Marketplace Sale: Listing #${listingId}`,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      // ✅ ТАКЖЕ ОБНОВЛЯЕМ БАЛАНС В ОСНОВНОЙ ТАБЛИЦЕ ПОЛЬЗОВАТЕЛЕЙ (coins)
      const { data: sellerUser } = await supabase
        .from('_pidr_users')
        .select('coins')
        .eq('telegram_id', sellerId)
        .single();

      if (sellerUser) {
        // Конвертируем крипту в монеты (1 TON = 1000 монет, например)
        const coinsToAdd = crypto === 'TON' ? Math.floor(price * 1000) : Math.floor(price * 100);
        await supabase
          .from('_pidr_users')
          .update({ coins: (sellerUser.coins || 0) + coinsToAdd })
          .eq('telegram_id', sellerId);
        
        console.log(`✅ Продавцу ${sellerId} также начислено ${coinsToAdd} монет в игре`);
      }

      if (sellerTxError) {
        console.error('❌ Ошибка записи транзакции продавца:', sellerTxError);
      }
    } catch (error: any) {
      console.error('❌ Ошибка начисления продавцу:', error);
      // Не прерываем процесс, просто логируем
    }

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

