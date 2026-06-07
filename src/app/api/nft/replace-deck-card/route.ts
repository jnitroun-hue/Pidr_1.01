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

/** POST /api/nft/replace-deck-card — заменить NFT в слоте колоды */
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
    const { existingCardId, newCardId, suit, rank, image_url } = body;

    if (!existingCardId || !newCardId) {
      return NextResponse.json({ success: false, error: 'existingCardId и newCardId обязательны' }, { status: 400 });
    }

    const resolvedNewId = resolveCardId(newCardId);
    const { data: nftCard, error: nftError } = await supabaseAdmin
      .from('_pidr_nft_cards')
      .select('id, suit, rank, image_url')
      .eq('id', resolvedNewId)
      .eq('user_id', userId)
      .maybeSingle();

    if (nftError || !nftCard) {
      return NextResponse.json(
        { success: false, error: 'Новая карта не найдена или вам не принадлежит' },
        { status: 404 }
      );
    }

    const normalizedRank = normalizeRankToken(nftCard.rank ?? rank);
    const normalizedSuit = normalizeSuitToken(nftCard.suit ?? suit);
    const resolvedImageUrl = nftCard.image_url || image_url;

    const { error: updateError } = await supabaseAdmin
      .from('_pidr_user_nft_deck')
      .update({
        nft_card_id: nftCard.id,
        suit: normalizedSuit,
        rank: normalizedRank,
        image_url: resolvedImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCardId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ [replace-deck-card] Ошибка:', updateError);
      return NextResponse.json({ success: false, error: 'Ошибка замены карты' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Карта заменена в игровой колоде' });
  } catch (error: unknown) {
    console.error('❌ [replace-deck-card] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
