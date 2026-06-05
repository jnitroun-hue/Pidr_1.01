/**
 * POST /api/nft/mint-random
 * Рандомная генерация NFT карты (0.5 TON или 0.1 SOL; Premium: 1 free/week)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import {
  consumeFreeRandomGeneration,
  getPremiumStatus,
} from '@/lib/premium/premium-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
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
    const { wallet_address, network, useFreePremium } = body;

    const dbUserId = parseInt(String(authContext.userId), 10);
    const premiumStatus = !Number.isNaN(dbUserId)
      ? await getPremiumStatus(dbUserId)
      : null;

    const wantsFree = useFreePremium === true && premiumStatus?.freeRandomAvailable;

    if (!wantsFree && !wallet_address) {
      return NextResponse.json(
        { success: false, message: 'wallet_address обязателен (или используйте бесплатную Premium генерацию)' },
        { status: 400 }
      );
    }

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];

    const rarityRoll = Math.random() * 100;
    let rarity: string;
    if (rarityRoll < 60) rarity = 'common';
    else if (rarityRoll < 85) rarity = 'rare';
    else rarity = 'epic';

    const mintPrice = wantsFree ? 0 : (network === 'SOL' ? 0.1 : 0.5);
    const commission = mintPrice;
    const masterWalletAddress = network === 'SOL'
      ? process.env.MASTER_SOLANA_ADDRESS
      : process.env.MASTER_TON_ADDRESS;

    const { data: nftData, error: nftError } = await supabase
      .from('_pidr_nft_ownership')
      .insert({
        user_id: authContext.userId,
        rank: randomRank,
        suit: randomSuit,
        rarity,
        mint_type: wantsFree ? 'random_premium_free' : 'random',
        wallet_address: wallet_address || null,
        network: network || 'TON',
        minted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (nftError || !nftData) {
      console.error('❌ Ошибка создания NFT:', nftError);
      return NextResponse.json({ success: false, error: 'Ошибка создания NFT' }, { status: 500 });
    }

    if (wantsFree && !Number.isNaN(dbUserId)) {
      await consumeFreeRandomGeneration(dbUserId, nftData.id);
    }

    await supabase.from('_pidr_nft_mint_history').insert({
      user_id: authContext.userId,
      nft_id: nftData.id,
      wallet_address: wallet_address || 'premium_free',
      mint_type: wantsFree ? 'random_premium_free' : 'random',
      mint_price_ton: network === 'TON' ? mintPrice : 0,
      mint_price_sol: network === 'SOL' ? mintPrice : 0,
      commission_paid_ton: network === 'TON' ? commission : 0,
      commission_paid_sol: network === 'SOL' ? commission : 0,
      master_wallet_address: masterWalletAddress,
      network: network || 'TON',
      status: wantsFree ? 'premium_free' : 'completed',
      minted_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      nft: { id: nftData.id, rank: randomRank, suit: randomSuit, rarity },
      mint_price: mintPrice,
      isPremiumFree: wantsFree,
      network: network || 'TON',
      master_wallet_address: wantsFree ? null : masterWalletAddress,
      message: wantsFree
        ? `Premium free roll: ${randomRank} of ${randomSuit} (${rarity})!`
        : `Выпала карта ${randomRank} of ${randomSuit} (${rarity})!`,
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка генерации случайной NFT:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
