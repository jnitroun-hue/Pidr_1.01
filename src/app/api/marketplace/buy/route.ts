import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const { requireAuth, getUserIdFromDatabase } = await import('@/lib/auth-utils');
    const auth = requireAuth(request);

    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId || !dbUser) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    const buyerId = dbUserId;
    
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
    
    const sellerId = listing.seller_user_id; // Получаем ID продавца из лота
    
    if (sellerId === buyerId) {
      return NextResponse.json(
        { success: false, error: 'Нельзя купить собственную карту' },
        { status: 400 }
      );
    }
    
    // Проверяем доступность оплаты
    let price: number | null = null;
    let cryptoCurrency: string | null = null;
    
    if (payment_method === 'coins') {
      price = listing.price_coins;
    } else if (payment_method === 'crypto') {
      // Определяем валюту и цену
      if (listing.price_ton) {
        price = listing.price_ton;
        cryptoCurrency = 'TON';
      } else if (listing.price_sol) {
        price = listing.price_sol;
        cryptoCurrency = 'SOL';
      }
    }
    
    if (!price) {
      return NextResponse.json(
        { success: false, error: `Этот лот недоступен для оплаты ${payment_method}` },
        { status: 400 }
      );
    }
    
    // Получаем баланс покупателя
    const { data: buyer, error: buyerError } = await supabase
      .from('_pidr_users')
      .select('id, coins')
      .eq('id', buyerId)
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
    
    // ✅ РАССЧИТЫВАЕМ КОМИССИЮ (ДЛЯ ОБОИХ ТИПОВ ОПЛАТЫ)
    const platformFee = Math.floor(price * 0.05);
    const sellerAmount = price - platformFee;

    // ✅ РАЗНАЯ ЛОГИКА ДЛЯ COINS И CRYPTO!
    if (payment_method === 'coins') {
      // ===== ОПЛАТА МОНЕТАМИ - МОМЕНТАЛЬНАЯ =====
      // 1. Списываем монеты у покупателя
      const { error: deductError } = await supabase
        .from('_pidr_users')
        .update({ coins: buyer.coins - price })
        .eq('id', buyerId);
      
      if (deductError) {
        console.error('❌ [Marketplace Buy] Ошибка списания монет:', deductError);
        return NextResponse.json(
          { success: false, error: 'Ошибка списания монет' },
          { status: 500 }
        );
      }

      // 2. Начисляем монеты продавцу (минус 5% комиссия)
      
      const { data: seller } = await supabase
        .from('_pidr_users')
        .select('coins')
        .eq('id', listing.seller_user_id)
        .single();
      
      if (seller) {
        await supabase
          .from('_pidr_users')
          .update({ coins: seller.coins + sellerAmount })
          .eq('id', listing.seller_user_id);
      }

      // 3. Переносим NFT к покупателю
      const { error: transferError } = await supabase
        .from('_pidr_nft_cards')
        .update({ user_id: buyerId })
        .eq('id', listing.nft_card_id);
      
      if (transferError) {
        console.error('❌ [Marketplace Buy] Ошибка переноса NFT:', transferError);
        // Откатываем монеты
        await supabase
          .from('_pidr_users')
          .update({ coins: buyer.coins })
          .eq('id', buyerId);
        return NextResponse.json(
          { success: false, error: 'Ошибка переноса NFT' },
          { status: 500 }
        );
      }

      // 4. Обновляем статус лота
      await supabase
        .from('_pidr_nft_marketplace')
        .update({
          status: 'sold',
          buyer_user_id: buyerId,
          sold_at: new Date().toISOString()
        })
        .eq('id', listing_id);

      // 5. Создаем запись транзакции
      await supabase
        .from('_pidr_marketplace_transactions')
        .insert({
          marketplace_listing_id: listing_id,
          seller_user_id: listing.seller_user_id,
          buyer_user_id: buyerId,
          nft_card_id: listing.nft_card_id,
          transaction_type: payment_method,
          amount_coins: price,
          amount_ton: null,
          amount_sol: null,
          crypto_currency: null,
          platform_fee_coins: platformFee,
          platform_fee_crypto: null,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
    } else if (payment_method === 'crypto') {
      // ===== ОПЛАТА КРИПТОЙ - ТОЛЬКО РЕЗЕРВИРУЕМ =====
      console.log(`💎 [Marketplace Buy] Резервируем лот ${listing_id} для покупателя ${buyerId}`);
      
      // НЕ переносим карту! Только резервируем лот
      await supabase
        .from('_pidr_nft_marketplace')
        .update({
          status: 'pending', // ✅ НОВЫЙ СТАТУС: ждём оплаты
          buyer_user_id: buyerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', listing_id);

      // Создаем запись транзакции со статусом "pending"
      await supabase
        .from('_pidr_marketplace_transactions')
        .insert({
          marketplace_listing_id: listing_id,
          seller_user_id: listing.seller_user_id,
          buyer_user_id: buyerId,
          nft_card_id: listing.nft_card_id,
          transaction_type: payment_method,
          amount_coins: null,
          amount_ton: cryptoCurrency === 'TON' ? price : null,
          amount_sol: cryptoCurrency === 'SOL' ? price : null,
          crypto_currency: cryptoCurrency,
          platform_fee_coins: null,
          platform_fee_crypto: price * 0.05,
          status: 'pending', // ✅ ЖДЁМ ПОДТВЕРЖДЕНИЯ!
          created_at: new Date().toISOString()
        });
    }
    
    console.log('✅ [Marketplace Buy] Покупка завершена!');
    
    // Генерируем payment URL для крипты
    let paymentUrl: string | undefined = undefined;
    let sellerWalletAddress: string | undefined = undefined;
    
    if (payment_method === 'crypto' && cryptoCurrency) {
      // ✅ ПОЛУЧАЕМ АДРЕС КОШЕЛЬКА ПРОДАВЦА ИЗ БД
      // ИСПРАВЛЕНО: Используем _pidr_player_wallets, а не _pidr_hd_wallets!
      const walletType = cryptoCurrency.toLowerCase(); // 'TON' -> 'ton', 'SOL' -> 'sol'
      
      const { data: sellerWallet, error: walletError } = await supabase
        .from('_pidr_player_wallets')
        .select('wallet_address')
        .eq('user_id', sellerId.toString())
        .eq('wallet_type', walletType)
        .eq('is_active', true)
        .single();
      
      if (walletError || !sellerWallet) {
        console.error('❌ [Marketplace Buy] Кошелек продавца не найден:', walletError);
        return NextResponse.json(
          { 
            success: false, 
            error: `Продавец не подключил ${cryptoCurrency} кошелек. Оплата невозможна.` 
          },
          { status: 400 }
        );
      }
      
      // ИСПРАВЛЕНО: Используем wallet_address вместо address
      sellerWalletAddress = sellerWallet.wallet_address;
      console.log(`💰 [Marketplace Buy] Адрес продавца (${cryptoCurrency}): ${sellerWalletAddress}`);
      
      if (cryptoCurrency === 'TON') {
        // TON Payment URL (Tonkeeper) - ДЕНЬГИ ИДУТ ПРОДАВЦУ!
        const amountNano = Math.floor(price * 1000000000); // TON в нанотоны
        paymentUrl = `https://app.tonkeeper.com/transfer/${sellerWalletAddress}?amount=${amountNano}&text=NFT_${listing_id}_from_${buyerId}`;
        
        // TODO: Комиссия платформы 5% - реализовать отдельным платежом или смарт-контрактом
        const platformFeeNano = Math.floor(price * 0.05 * 1000000000);
        console.log(`💸 [Marketplace] Комиссия платформы: ${price * 0.05} TON (${platformFeeNano} nano)`);
        
      } else if (cryptoCurrency === 'SOL') {
        // Solana Pay URL - ДЕНЬГИ ИДУТ ПРОДАВЦУ!
        paymentUrl = `solana:${sellerWalletAddress}?amount=${price}&label=NFT_${listing_id}&message=NFT_from_buyer_${buyerId}`;
        
        // TODO: Комиссия платформы 5% - реализовать отдельным платежом
        console.log(`💸 [Marketplace] Комиссия платформы: ${price * 0.05} SOL`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'NFT успешно куплена!',
      nft_card: listing.nft_card,
      paid: price,
      platform_fee: platformFee,
      payment_method,
      crypto_currency: cryptoCurrency,
      payment_url: paymentUrl,
      seller_wallet: sellerWalletAddress, // Адрес продавца для информации
      seller_id: sellerId
    });
    
  } catch (error: any) {
    console.error('❌ [Marketplace Buy] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

