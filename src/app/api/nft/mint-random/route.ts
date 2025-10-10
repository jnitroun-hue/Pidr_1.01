import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { requireAuth } from '../../../../../lib/auth-utils';

/**
 * POST /api/nft/mint-random
 * Рандомная генерация NFT карты (0.5 TON комиссия)
 * Вероятности: 2-10 = 95%, J-K = 4%, A = 1%
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    console.log(`🎲 Пользователь ${userId} запрашивает рандомную генерацию NFT...`);

    const { wallet_address } = await req.json();

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, message: 'wallet_address обязателен' },
        { status: 400 }
      );
    }

    // Проверяем, что кошелек принадлежит пользователю
    const { data: walletCheck, error: walletError } = await supabase
      .from('_pidr_player_wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('wallet_address', wallet_address)
      .single();

    if (walletError || !walletCheck) {
      return NextResponse.json(
        { success: false, message: 'Кошелек не подключен' },
        { status: 403 }
      );
    }

    // Получаем все карты из БД
    const { data: allCards, error: cardsError } = await supabase
      .from('_pidr_nft_cards')
      .select('*');

    if (cardsError || !allCards || allCards.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ошибка загрузки карт' },
        { status: 500 }
      );
    }

    // Рандомная генерация с вероятностями
    const randomValue = Math.random() * 100;
    let selectedCard;

    if (randomValue < 1) {
      // 1% - Тузы (A)
      const aces = allCards.filter(c => c.card_rank === 'A');
      selectedCard = aces[Math.floor(Math.random() * aces.length)];
    } else if (randomValue < 5) {
      // 4% - Фигуры (J, Q, K)
      const figures = allCards.filter(c => ['J', 'Q', 'K'].includes(c.card_rank));
      selectedCard = figures[Math.floor(Math.random() * figures.length)];
    } else {
      // 95% - Обычные карты (2-10)
      const numbers = allCards.filter(c => !['J', 'Q', 'K', 'A'].includes(c.card_rank));
      selectedCard = numbers[Math.floor(Math.random() * numbers.length)];
    }

    if (!selectedCard) {
      return NextResponse.json(
        { success: false, message: 'Не удалось выбрать карту' },
        { status: 500 }
      );
    }

    // Резервируем минт
    const mintPrice = 0.5; // Фиксированная цена для рандомной генерации
    const commission = 0.5; // Вся сумма идет на мастер-кошелек
    const masterWalletAddress = process.env.MASTER_TON_ADDRESS || '';

    const { data: mintHistory, error: mintError } = await supabase
      .from('_pidr_nft_mint_history')
      .insert({
        user_id: userId,
        card_id: selectedCard.card_id,
        wallet_address,
        nft_address: '', // Будет заполнено после минта
        mint_type: 'random',
        mint_price_ton: mintPrice,
        commission_paid_ton: commission,
        master_wallet_address: masterWalletAddress,
        transaction_hash: '',
        status: 'pending'
      })
      .select()
      .single();

    if (mintError) {
      console.error('❌ Ошибка создания истории минта:', mintError);
      return NextResponse.json(
        { success: false, message: 'Ошибка резервирования минта' },
        { status: 500 }
      );
    }

    console.log(`✅ Рандомная карта выбрана: ${selectedCard.card_name}`);
    
    return NextResponse.json({
      success: true,
      mint_id: mintHistory.id,
      card: {
        card_id: selectedCard.card_id,
        card_name: selectedCard.card_name,
        card_rank: selectedCard.card_rank,
        card_suit: selectedCard.card_suit,
        rarity: selectedCard.rarity,
        image_url: selectedCard.image_url
      },
      mint_price_ton: mintPrice,
      commission_ton: commission,
      master_wallet_address: masterWalletAddress,
      message: `Выпала карта: ${selectedCard.card_name}! Подтвердите транзакцию.`
    });

  } catch (error: any) {
    console.error('❌ Ошибка API рандомной генерации NFT:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

