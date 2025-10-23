import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';
import { getNFTService } from '../../../../lib/ton/nft-service';

/**
 * POST /api/nft/mint
 * Резервирование и подготовка к минту NFT карты
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    console.log(`🎨 Пользователь ${userId} запрашивает минт NFT...`);

    const { card_id, wallet_address } = await req.json();

    if (!card_id || !wallet_address) {
      return NextResponse.json(
        { success: false, message: 'card_id и wallet_address обязательны' },
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

    // Резервируем минт через SQL функцию
    const { data, error } = await supabase.rpc('reserve_nft_mint', {
      p_user_id: userId,
      p_card_id: card_id,
      p_wallet_address: wallet_address
    });

    if (error) {
      console.error('❌ Ошибка резервирования минта:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Ошибка резервирования' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.message },
        { status: 400 }
      );
    }

    // Получаем данные карты и создаем метаданные
    const nftService = getNFTService();
    const card = data.card;
    
    // Создаем URL для метаданных
    const metadataUrl = nftService.createMetadataUrl(card_id);

    // Рассчитываем цену минта
    const mintPrice = nftService.calculateMintPrice(card.rarity);

    console.log(`✅ Минт зарезервирован: ${card.card_name} для ${wallet_address}`);
    
    return NextResponse.json({
      success: true,
      mint_id: data.mint_id,
      card: {
        card_id: card.card_id,
        card_name: card.card_name,
        card_rank: card.card_rank,
        card_suit: card.card_suit,
        rarity: card.rarity,
        image_url: card.image_url
      },
      mint_price_ton: mintPrice,
      metadata_url: metadataUrl,
      message: 'Минт зарезервирован. Подтвердите транзакцию в кошельке.'
    });

  } catch (error: any) {
    console.error('❌ Ошибка API минта NFT:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

/**
 * PUT /api/nft/mint
 * Подтверждение минта после транзакции в блокчейне
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    console.log(`✅ Подтверждение минта для пользователя ${userId}...`);

    const { mint_id, nft_address, transaction_hash, token_id } = await req.json();

    if (!mint_id || !nft_address || !transaction_hash) {
      return NextResponse.json(
        { success: false, message: 'mint_id, nft_address и transaction_hash обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что минт принадлежит пользователю
    const { data: mintCheck, error: mintError } = await supabase
      .from('_pidr_nft_mint_history')
      .select('id, user_id, card_id')
      .eq('id', mint_id)
      .eq('user_id', userId)
      .single();

    if (mintError || !mintCheck) {
      return NextResponse.json(
        { success: false, message: 'Минт не найден или не принадлежит пользователю' },
        { status: 403 }
      );
    }

    // Подтверждаем минт через SQL функцию
    const { data, error } = await supabase.rpc('confirm_nft_mint', {
      p_mint_id: mint_id,
      p_nft_address: nft_address,
      p_transaction_hash: transaction_hash,
      p_token_id: token_id || null
    });

    if (error) {
      console.error('❌ Ошибка подтверждения минта:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Ошибка подтверждения' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.message },
        { status: 400 }
      );
    }

    console.log(`✅ NFT успешно заминчен: ${nft_address}`);
    
    return NextResponse.json({
      success: true,
      message: 'NFT успешно заминчен!',
      nft_address,
      transaction_hash
    });

  } catch (error: any) {
    console.error('❌ Ошибка API подтверждения минта:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

