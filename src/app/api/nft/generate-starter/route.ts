/**
 * POST /api/nft/generate-starter
 * Бесплатная первая NFT-карта для нового игрока (только если коллекция пуста).
 * Карта сразу добавляется в игровую колоду.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { NFT_CARDS_TABLE, NFT_STORAGE_BUCKET, USER_NFT_DECK_TABLE } from '@/lib/nft/constants';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';
import { composeRandomThemedCardBuffer } from '@/lib/nft/compose-theme-card';
import { NFT_THEME_CONFIG, type NftThemeKey } from '@/lib/nft/theme-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STARTER_STORAGE_PREFIX = 'starter';

function normalizeRank(rank: string): string {
  const r = rank.toUpperCase();
  if (r === 'J') return 'jack';
  if (r === 'Q') return 'queen';
  if (r === 'K') return 'king';
  if (r === 'A') return 'ace';
  return rank.toLowerCase();
}

function buildStarterStoragePath(userId: number, suit: string, rank: string): string {
  const safeRank = rank.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeSuit = suit.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${STARTER_STORAGE_PREFIX}/${userId}/${safeSuit}_${safeRank}_${Date.now()}.png`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from(NFT_CARDS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dbUserId);

    if (countError) {
      console.error('❌ [generate-starter] count:', countError);
      return NextResponse.json({ success: false, error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'ALREADY_HAS_CARDS', message: 'У вас уже есть NFT карты в коллекции' },
        { status: 400 }
      );
    }

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRankRaw = ranks[Math.floor(Math.random() * ranks.length)];
    const randomRank = normalizeRank(randomRankRaw);
    const normalizedSuit = normalizeSuitToken(randomSuit);
    const normalizedRank = normalizeRankToken(randomRank);

    let imageUrl = `/img/cards/${normalizedRank}_of_${normalizedSuit}.png`;
    let storagePath: string | null = null;
    let themeMeta: { theme?: string; theme_id?: number } = {};

    try {
      const { buffer, pick } = await composeRandomThemedCardBuffer({
        suit: randomSuit,
        rankRaw: randomRankRaw,
        rankNormalized: randomRank,
      });

      storagePath = buildStarterStoragePath(dbUserId, randomSuit, randomRank);
      const { error: uploadError } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).upload(storagePath, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.warn('⚠️ [generate-starter] upload fallback:', uploadError.message);
        storagePath = null;
      } else {
        const { data: urlData } = supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(storagePath);
        if (urlData?.publicUrl) {
          imageUrl = urlData.publicUrl;
          themeMeta = { theme: pick.theme, theme_id: pick.themeId };
        }
      }
    } catch (composeErr) {
      console.warn('⚠️ [generate-starter] compose fallback:', composeErr);
    }

    const rarity = themeMeta.theme || 'common';

    const { data: savedCard, error: saveError } = await supabaseAdmin
      .from(NFT_CARDS_TABLE)
      .insert({
        user_id: dbUserId,
        suit: normalizedSuit,
        rank: normalizedRank,
        rarity,
        image_url: imageUrl,
        storage_path: storagePath,
        cost: 0,
        payment_method: 'starter_free',
        metadata: {
          mint_type: 'starter_free',
          generated_at: new Date().toISOString(),
          ...(storagePath ? { starter_storage_path: storagePath } : {}),
          ...themeMeta,
        },
      })
      .select('id, rank, suit, rarity, image_url')
      .single();

    if (saveError || !savedCard) {
      console.error('❌ [generate-starter] save:', saveError);
      if (storagePath) {
        await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]);
      }
      return NextResponse.json({ success: false, error: 'Ошибка сохранения карты' }, { status: 500 });
    }

    const { error: deckError } = await supabaseAdmin.from(USER_NFT_DECK_TABLE).insert({
      user_id: dbUserId,
      nft_card_id: savedCard.id,
      suit: normalizedSuit,
      rank: normalizedRank,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (deckError) {
      console.error('❌ [generate-starter] deck insert:', deckError);
      await supabaseAdmin.from(NFT_CARDS_TABLE).delete().eq('id', savedCard.id);
      if (storagePath) {
        await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]);
      }
      return NextResponse.json({ success: false, error: 'Ошибка добавления в колоду' }, { status: 500 });
    }

    const themeLabel =
      themeMeta.theme && themeMeta.theme in NFT_THEME_CONFIG
        ? NFT_THEME_CONFIG[themeMeta.theme as NftThemeKey].name
        : rarity;

    return NextResponse.json({
      success: true,
      card: savedCard,
      message: `Ваша первая карта: ${randomRankRaw} ${randomSuit} (${themeLabel})!`,
      addedToDeck: true,
    });
  } catch (error: unknown) {
    console.error('❌ [generate-starter]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
