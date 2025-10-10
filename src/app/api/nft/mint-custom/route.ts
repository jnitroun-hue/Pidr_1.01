import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

/**
 * POST /api/nft/mint-custom
 * Кастомная генерация NFT карты (3 TON комиссия)
 * Игрок выбирает масть, ранг, стиль и может загрузить изображение
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    console.log(`🎨 Пользователь ${userId} запрашивает кастомную генерацию NFT...`);

    const { 
      wallet_address, 
      card_rank, 
      card_suit, 
      custom_style, 
      custom_image_url 
    } = await req.json();

    if (!wallet_address || !card_rank || !card_suit) {
      return NextResponse.json(
        { success: false, message: 'wallet_address, card_rank и card_suit обязательны' },
        { status: 400 }
      );
    }

    // Валидация ранга и масти
    const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const validSuits = ['hearts', 'diamonds', 'clubs', 'spades'];

    if (!validRanks.includes(card_rank) || !validSuits.includes(card_suit)) {
      return NextResponse.json(
        { success: false, message: 'Неверный ранг или масть карты' },
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

    // Находим базовую карту в БД
    const card_id = `${card_rank.toLowerCase()}_of_${card_suit}`;
    const { data: baseCard, error: cardError } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('card_id', card_id)
      .single();

    if (cardError || !baseCard) {
      return NextResponse.json(
        { success: false, message: 'Карта не найдена в базе' },
        { status: 404 }
      );
    }

    // Резервируем минт
    const mintPrice = 3.0; // Фиксированная цена для кастомной генерации
    const commission = 3.0; // Вся сумма идет на мастер-кошелек
    const masterWalletAddress = process.env.MASTER_TON_ADDRESS || '';

    const { data: mintHistory, error: mintError } = await supabase
      .from('_pidr_nft_mint_history')
      .insert({
        user_id: userId,
        card_id: baseCard.card_id,
        wallet_address,
        nft_address: '', // Будет заполнено после минта
        mint_type: 'custom',
        mint_price_ton: mintPrice,
        commission_paid_ton: commission,
        master_wallet_address: masterWalletAddress,
        transaction_hash: '',
        status: 'pending',
        metadata: {
          custom_style: custom_style || 'default',
          custom_image_url: custom_image_url || null,
          card_rank,
          card_suit
        }
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

    console.log(`✅ Кастомная карта зарезервирована: ${baseCard.card_name} (стиль: ${custom_style || 'default'})`);
    
    return NextResponse.json({
      success: true,
      mint_id: mintHistory.id,
      card: {
        card_id: baseCard.card_id,
        card_name: baseCard.card_name,
        card_rank: baseCard.card_rank,
        card_suit: baseCard.card_suit,
        rarity: baseCard.rarity,
        image_url: custom_image_url || baseCard.image_url,
        custom_style: custom_style || 'default'
      },
      mint_price_ton: mintPrice,
      commission_ton: commission,
      master_wallet_address: masterWalletAddress,
      message: `Кастомная карта ${baseCard.card_name} готова к минту! Подтвердите транзакцию.`
    });

  } catch (error: any) {
    console.error('❌ Ошибка API кастомной генерации NFT:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

