/**
 * POST /api/nft/mint-random
 * Рандомная генерация NFT карты (0.5 TON или 0.1 SOL комиссия)
 * Вероятности: Common (60%), Rare (25%), Epic (15%)
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
      console.error('❌ [mint-random] Supabase не настроен');
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
    const { wallet_address, network } = body; // network: 'TON' или 'SOL'

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, message: 'wallet_address обязателен' },
        { status: 400 }
      );
    }

    // Генерируем случайную карту
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
    
    // Определяем редкость: Common (60%), Rare (25%), Epic (15%)
    const rarityRoll = Math.random() * 100;
    let rarity: string;
    if (rarityRoll < 60) {
      rarity = 'common';
    } else if (rarityRoll < 85) {
      rarity = 'rare';
    } else {
      rarity = 'epic';
    }

    // Цены в зависимости от сети
    const mintPrice = network === 'SOL' ? 0.1 : 0.5; // SOL дешевле
    const commission = mintPrice;
    const masterWalletAddress = network === 'SOL' 
      ? process.env.MASTER_SOLANA_ADDRESS 
      : process.env.MASTER_TON_ADDRESS;

    // Создаем запись NFT в БД
    const { data: nftData, error: nftError } = await supabase
      .from('_pidr_nft_ownership')
      .insert({
        user_id: authContext.userId,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        mint_type: 'random',
        wallet_address,
        network: network || 'TON',
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
        mint_type: 'random',
        mint_price_ton: network === 'TON' ? mintPrice : 0,
        mint_price_sol: network === 'SOL' ? mintPrice : 0,
        commission_paid_ton: network === 'TON' ? commission : 0,
        commission_paid_sol: network === 'SOL' ? commission : 0,
        master_wallet_address: masterWalletAddress,
        network: network || 'TON',
        status: 'completed',
        minted_at: new Date().toISOString(),
      });

    console.log(`✅ Случайная NFT карта создана: ${randomRank} of ${randomSuit} (${rarity})`);
    
    return NextResponse.json({
      success: true,
      nft: {
        id: nftData.id,
        rank: randomRank,
        suit: randomSuit,
        rarity,
      },
      mint_price: mintPrice,
      network: network || 'TON',
      master_wallet_address: masterWalletAddress,
      message: `Выпала карта ${randomRank} of ${randomSuit} (${rarity})!`
    });

  } catch (error: any) {
    console.error('❌ Ошибка генерации случайной NFT:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

