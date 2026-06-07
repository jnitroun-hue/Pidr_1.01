/**
 * POST /api/nft/add-to-deck — добавить NFT в игровую колоду
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveCardId(id: string | number): string | number {
  const n = Number(id);
  if (Number.isFinite(n) && String(n) === String(id).trim()) return n;
  return id;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден в БД' }, { status: 404 });
    }

    const body = await request.json();
    const { nft_card_id, nftId, suit, rank, image_url, imageUrl } = body;
    const cardId = resolveCardId(nft_card_id || nftId);
    const cardImageUrl = image_url || imageUrl;

    if (cardId === undefined || cardId === null || cardId === '') {
      return NextResponse.json({ success: false, error: 'nft_card_id обязателен' }, { status: 400 });
    }

    const { data: nftCard, error: nftError } = await supabaseAdmin
      .from('_pidr_nft_cards')
      .select('id, user_id, suit, rank, image_url, rarity')
      .eq('id', cardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (nftError || !nftCard) {
      return NextResponse.json(
        { success: false, error: nftError?.message || 'Карта не найдена или вам не принадлежит' },
        { status: nftError ? 500 : 404 }
      );
    }

    const normalizedRank = normalizeRankToken(nftCard.rank ?? rank);
    const normalizedSuit = normalizeSuitToken(nftCard.suit ?? suit);
    const resolvedImageUrl = nftCard.image_url || cardImageUrl;

    if (!normalizedRank || !normalizedSuit) {
      return NextResponse.json(
        { success: false, error: 'Не удалось определить ранг или масть карты' },
        { status: 400 }
      );
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('_pidr_user_nft_deck')
      .select('*, nft_card:_pidr_nft_cards(id, image_url, rarity)')
      .eq('user_id', userId)
      .eq('suit', normalizedSuit)
      .eq('rank', normalizedRank)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [add-to-deck] Ошибка проверки дубликата:', checkError);
      return NextResponse.json({ success: false, error: checkError.message }, { status: 500 });
    }

    if (existing) {
      const existingCardInfo = (existing as { nft_card?: { image_url?: string; rarity?: string } }).nft_card || {};
      return NextResponse.json({
        success: false,
        error: 'DUPLICATE_CARD',
        message: `У вас уже есть карта ${normalizedRank} ${normalizedSuit} в колоде`,
        existingCard: {
          id: existing.id,
          nft_card_id: existing.nft_card_id,
          image_url: existing.image_url || existingCardInfo.image_url,
          rarity: existingCardInfo.rarity,
        },
        newCard: {
          id: nftCard.id,
          image_url: resolvedImageUrl,
          suit: normalizedSuit,
          rank: normalizedRank,
        },
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('_pidr_user_nft_deck')
      .insert({
        user_id: userId,
        nft_card_id: nftCard.id,
        suit: normalizedSuit,
        rank: normalizedRank,
        image_url: resolvedImageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ [add-to-deck] Ошибка insert:', insertError);
      return NextResponse.json({ success: false, error: 'Ошибка добавления карты' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Карта добавлена в игровую колоду',
      deckEntry: {
        nft_card_id: nftCard.id,
        suit: normalizedSuit,
        rank: normalizedRank,
        image_url: resolvedImageUrl,
      },
    });
  } catch (error: unknown) {
    console.error('❌ [add-to-deck] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
