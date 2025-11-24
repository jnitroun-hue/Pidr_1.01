/**
 * POST /api/nft/mint-burning
 * Генерация BURNING NFT карты с горящей мастью за 20000 монет + привязка к кошельку
 * Гарантированная редкость: Legendary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session-utils';
import { createClient } from '@supabase/supabase-js';

const BURNING_MINT_COST = 20000; // 20000 монет

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = getSessionFromRequest(request);
    
    if (!session) {
      console.error('❌ [mint-burning] Не авторизован');
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = session.telegramId;
    console.log('✅ [mint-burning] Авторизован:', { userId, username: session.username });

    // Ленивая инициализация Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [mint-burning] Supabase не настроен:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return NextResponse.json(
        { success: false, error: 'Supabase не настроен. Обратитесь к администратору.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { wallet_address, network } = body; // опционально - для привязки к кошельку

    // Проверяем баланс пользователя
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('coins')
      .eq('telegram_id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (userData.coins < BURNING_MINT_COST) {
      return NextResponse.json(
        { 
          error: 'Недостаточно монет',
          required: BURNING_MINT_COST,
          current: userData.coins
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
        coins: userData.coins - BURNING_MINT_COST,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Ошибка списания монет' },
        { status: 500 }
      );
    }

    // Создаем запись NFT в БД (с опциональной привязкой к кошельку)
    const { data: nftData, error: nftError } = await supabase
      .from('_pidr_nft_ownership')
      .insert({
        user_telegram_id: userId,
        rank: randomRank, // ✅ ИСПРАВЛЕНО: rank вместо card_rank
        suit: randomSuit, // ✅ ИСПРАВЛЕНО: suit вместо card_suit
        rarity,
        acquired_via: 'burning',
        metadata: burningParams,
        blockchain: network || 'none',
        minted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (nftError || !nftData) {
      // Откатываем транзакцию
      await supabase
        .from('_pidr_users')
        .update({ coins: userData.coins })
        .eq('telegram_id', userId);

      console.error('❌ Ошибка создания NFT:', nftError);
      return NextResponse.json(
        { success: false, error: 'Ошибка создания NFT' },
        { status: 500 }
      );
    }

    console.log(`✅ Горящая NFT карта создана: ${randomRank} of ${randomSuit} (${rarity})`);

    return NextResponse.json({
      success: true,
      nft: {
        id: nftData.id,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        burningParams,
      },
      newBalance: userData.coins - BURNING_MINT_COST,
      message: `Создана уникальная горящая карта ${randomRank} ${getSuitEmoji(randomSuit)}!`
    });

  } catch (error: any) {
    console.error('❌ Ошибка генерации горящей NFT:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

function getSuitEmoji(suit: string): string {
  switch (suit) {
    case 'hearts': return '♥️';
    case 'diamonds': return '♦️';
    case 'clubs': return '♣️';
    case 'spades': return '♠️';
    default: return suit;
  }
}

