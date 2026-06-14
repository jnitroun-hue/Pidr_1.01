/**
 * POST /api/nft/mint-random
 * Рандомная NFT (0.5 TON / Premium: 1 free/week → запись в _pidr_nft_cards)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { NFT_CARDS_TABLE } from '@/lib/nft/constants';
import {
  consumeFreeRandomGeneration,
  getPremiumStatus,
} from '@/lib/premium/premium-service';
import {
  removePremiumFreeCardFromBucket,
  uploadPremiumFreeCardToBucket,
} from '@/lib/premium/premium-free-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeRank(rank: string): string {
  const r = rank.toUpperCase();
  if (r === 'J') return 'jack';
  if (r === 'Q') return 'queen';
  if (r === 'K') return 'king';
  if (r === 'A') return 'ace';
  return rank.toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Не авторизован' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { wallet_address, network, useFreePremium } = body;
    const wantsFree = useFreePremium === true;

    if (wantsFree) {
      const premiumStatus = await getPremiumStatus(dbUserId);
      if (!premiumStatus.freeRandomAvailable) {
        return NextResponse.json(
          { success: false, error: 'Бесплатная генерация недоступна (нужен Premium и пауза 7 дней)' },
          { status: 400 }
        );
      }
    } else if (!wallet_address) {
      return NextResponse.json(
        { success: false, message: 'wallet_address обязателен' },
        { status: 400 }
      );
    }

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRankRaw = ranks[Math.floor(Math.random() * ranks.length)];
    const randomRank = normalizeRank(randomRankRaw);

    const rarityRoll = Math.random() * 100;
    const rarity = rarityRoll < 60 ? 'common' : rarityRoll < 85 ? 'rare' : 'epic';

    const rankFile = randomRankRaw === '10' ? '10' : randomRankRaw.toLowerCase();
    const fallbackImageUrl = `/cards/${rankFile}_of_${randomSuit}.png`;

    let imageUrl = fallbackImageUrl;
    let storagePath: string | null = null;

    if (wantsFree) {
      try {
        const uploaded = await uploadPremiumFreeCardToBucket({
          userId: dbUserId,
          suit: randomSuit,
          rankRaw: randomRankRaw,
          rankNormalized: randomRank,
        });
        imageUrl = uploaded.publicUrl;
        storagePath = uploaded.storagePath;
      } catch (uploadErr) {
        console.error('❌ mint-random premium-free storage:', uploadErr);
        return NextResponse.json(
          {
            success: false,
            error: uploadErr instanceof Error ? uploadErr.message : 'Ошибка сохранения в Storage',
          },
          { status: 500 }
        );
      }
    }

    const { data: savedCard, error: saveError } = await supabaseAdmin
      .from(NFT_CARDS_TABLE)
      .insert({
        user_id: dbUserId,
        suit: randomSuit,
        rank: randomRank,
        rarity,
        image_url: imageUrl,
        storage_path: storagePath,
        cost: wantsFree ? 0 : null,
        payment_method: wantsFree ? 'premium_free' : null,
        metadata: {
          mint_type: wantsFree ? 'random_premium_free' : 'random',
          wallet_address: wallet_address || null,
          network: network || 'TON',
          generated_at: new Date().toISOString(),
          ...(storagePath ? { premium_free_storage_path: storagePath } : {}),
        },
      })
      .select('id, rank, suit, rarity, image_url, storage_path')
      .single();

    if (saveError || !savedCard) {
      console.error('❌ mint-random save:', saveError);
      if (storagePath) await removePremiumFreeCardFromBucket(storagePath);
      return NextResponse.json({ success: false, error: 'Ошибка сохранения NFT' }, { status: 500 });
    }

    if (wantsFree) {
      const consumed = await consumeFreeRandomGeneration(dbUserId, savedCard.id, storagePath);
      if (!consumed) {
        await supabaseAdmin.from(NFT_CARDS_TABLE).delete().eq('id', savedCard.id);
        await removePremiumFreeCardFromBucket(storagePath);
        return NextResponse.json(
          { success: false, error: 'Бесплатная генерация будет доступна через 7 дней после последней' },
          { status: 400 }
        );
      }
    }

    const mintPrice = wantsFree ? 0 : network === 'SOL' ? 0.1 : 0.5;
    const masterWalletAddress = !wantsFree
      ? (network === 'SOL' ? process.env.MASTER_SOLANA_ADDRESS : process.env.MASTER_TON_ADDRESS)
      : null;

    return NextResponse.json({
      success: true,
      nft: savedCard,
      card: savedCard,
      mint_price: mintPrice,
      isPremiumFree: wantsFree,
      network: network || 'TON',
      master_wallet_address: masterWalletAddress,
      message: wantsFree
        ? `Premium: ${randomRankRaw} ${randomSuit} (${rarity})! Сохранено в Storage.`
        : `Выпала карта ${randomRankRaw} of ${randomSuit} (${rarity})!`,
      storage_path: storagePath,
    });
  } catch (error: unknown) {
    console.error('❌ mint-random:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
