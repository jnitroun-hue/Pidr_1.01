/**
 * POST /api/nft/mint-burning
 * Генерация NFT карты с горящей мастью за 20000 монет
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const BURNING_MINT_COST = 20000; // 20000 монет

export async function POST(request: NextRequest) {
  try {
    // Ленивая инициализация Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [mint-burning] Supabase не настроен:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return NextResponse.json(
        { error: 'Supabase не настроен. Обратитесь к администратору.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authContext = await requireAuth(request);
    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Проверяем баланс пользователя
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('balance')
      .eq('id', authContext.userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (userData.balance < BURNING_MINT_COST) {
      return NextResponse.json(
        { 
          error: 'Недостаточно монет',
          required: BURNING_MINT_COST,
          current: userData.balance
        },
        { status: 400 }
      );
    }

    // Генерируем случайную карту
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
    
    // Генерируем случайные параметры горения
    const fireColors = ['#ff0000', '#ff6600', '#ffaa00', '#00ff00', '#0000ff', '#ff00ff', '#00ffff'];
    const burningParams = {
      intensity: Math.floor(Math.random() * 70) + 30,
      fireColor: fireColors[Math.floor(Math.random() * fireColors.length)],
      glowIntensity: Math.floor(Math.random() * 50) + 50,
      sparkles: Math.random() > 0.5,
    };

    // Определяем редкость на основе интенсивности огня
    let rarity: string;
    if (burningParams.intensity > 80) {
      rarity = 'legendary'; // 5%
    } else if (burningParams.intensity > 60) {
      rarity = 'epic'; // 20%
    } else if (burningParams.intensity > 40) {
      rarity = 'rare'; // 30%
    } else {
      rarity = 'common'; // 45%
    }

    // Списываем монеты
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({ 
        balance: userData.balance - BURNING_MINT_COST,
        updated_at: new Date().toISOString()
      })
      .eq('id', authContext.userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Ошибка списания монет' },
        { status: 500 }
      );
    }

    // Создаем запись NFT в БД
    const { data: nftData, error: nftError } = await supabase
      .from('_pidr_nft_ownership')
      .insert({
        user_id: authContext.userId,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        mint_type: 'burning',
        custom_style: JSON.stringify(burningParams),
        minted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (nftError || !nftData) {
      // Откатываем транзакцию
      await supabase
        .from('_pidr_users')
        .update({ balance: userData.balance })
        .eq('id', authContext.userId);

      return NextResponse.json(
        { error: 'Ошибка создания NFT' },
        { status: 500 }
      );
    }

    // Записываем историю минта
    await supabase
      .from('_pidr_nft_mint_history')
      .insert({
        user_id: authContext.userId,
        nft_id: nftData.id,
        mint_type: 'burning',
        mint_price_ton: 0,
        commission_paid_ton: 0,
        master_wallet_address: null,
        minted_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      nft: {
        id: nftData.id,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        burningParams,
      },
      newBalance: userData.balance - BURNING_MINT_COST,
    });

  } catch (error: any) {
    console.error('❌ Ошибка генерации горящей NFT:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

