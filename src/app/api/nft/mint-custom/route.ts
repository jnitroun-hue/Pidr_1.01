/**
 * POST /api/nft/mint-custom
 * Кастомная генерация NFT карты (3 TON или 0.5 SOL комиссия)
 * Игрок выбирает масть, ранг, стиль - гарантированная редкость Rare или выше
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/auth-middleware';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Ленивая инициализация Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [mint-custom] Supabase не настроен');
      return NextResponse.json(
        { success: false, error: 'Supabase не настроен. Обратитесь к администратору.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authContext = await requireAuth(request);
    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { success: false, error: authContext.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { wallet_address, network, custom_style, effects } = body; // network: 'TON' или 'SOL'

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, message: 'wallet_address обязателен' },
        { status: 400 }
      );
    }

    // Генерируем случайную карту с ГАРАНТИРОВАННОЙ редкостью Rare или выше
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
    
    // Гарантированная редкость Rare или выше: Rare (50%), Epic (35%), Legendary (15%)
    const rarityRoll = Math.random() * 100;
    let rarity: string;
    if (rarityRoll < 50) {
      rarity = 'rare';
    } else if (rarityRoll < 85) {
      rarity = 'epic';
    } else {
      rarity = 'legendary';
    }

    // Цены в зависимости от сети
    const mintPrice = network === 'SOL' ? 0.5 : 3.0; // SOL дешевле
    const commission = mintPrice;
    const masterWalletAddress = network === 'SOL' 
      ? process.env.MASTER_SOLANA_ADDRESS 
      : process.env.MASTER_TON_ADDRESS;

    // Создаем запись NFT в БД с кастомными параметрами
    const { data: nftData, error: nftError } = await supabase
      .from('_pidr_nft_ownership')
      .insert({
        user_id: authContext.userId,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        mint_type: 'custom',
        wallet_address,
        network: network || 'TON',
        custom_style: JSON.stringify({
          style: custom_style || 'premium',
          effects: effects || [],
          timestamp: new Date().toISOString()
        }),
        minted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (nftError || !nftData) {
      console.error('❌ Ошибка создания NFT:', nftError);
      return NextResponse.json(
        { success: false, error: 'Ошибка создания NFT' },
        { status: 500 }
      );
    }

    // Записываем историю минта
    await supabase
      .from('_pidr_nft_mint_history')
      .insert({
        user_id: authContext.userId,
        nft_id: nftData.id,
        wallet_address,
        mint_type: 'custom',
        mint_price_ton: network === 'TON' ? mintPrice : 0,
        mint_price_sol: network === 'SOL' ? mintPrice : 0,
        commission_paid_ton: network === 'TON' ? commission : 0,
        commission_paid_sol: network === 'SOL' ? commission : 0,
        master_wallet_address: masterWalletAddress,
        network: network || 'TON',
        status: 'completed',
        minted_at: new Date().toISOString(),
      });

    console.log(`✅ Кастомная NFT карта создана: ${randomRank} of ${randomSuit} (${rarity})`);
    
    return NextResponse.json({
      success: true,
      nft: {
        id: nftData.id,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        effects: effects || []
      },
      mint_price: mintPrice,
      network: network || 'TON',
      master_wallet_address: masterWalletAddress,
      message: `Создана кастомная карта ${randomRank} of ${randomSuit} (${rarity})!`
    });

  } catch (error: any) {
    console.error('❌ Ошибка генерации кастомной NFT:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

