import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';
import { deckOwnerIds, fetchUserDeckRows } from '@/lib/nft/deck-slots';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🎴 API: Получение игровой колоды пользователя

export async function GET(request: NextRequest) {
  // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ ДЛЯ РЕАЛЬНОГО ВРЕМЕНИ
  try {
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную систему авторизации
    const auth = requireAuth(request);
    
    if (auth.error || !auth.userId) {
      console.error('❌ [GET DECK] Ошибка авторизации:', auth.error);
      return NextResponse.json(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const { userId, environment } = auth;
    console.log(`🎴 [GET DECK] Получение колоды для пользователя ${userId} (${environment})...`);

    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId || !user) {
      console.error(`❌ [GET DECK] Пользователь не найден (${environment}):`, userId);
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    const ownerIds = deckOwnerIds(dbUserId, user.telegram_id);
    const deckCards = await fetchUserDeckRows(supabaseAdmin, ownerIds);

    console.log(`✅ [GET DECK] Найдено ${deckCards.length} карт в колоде (owners: ${ownerIds.join(',')})`);

    const deck = deckCards.map((card) => {
      const nftCard = card.nft_card || null;
      const rawSuit = nftCard?.suit ?? card.suit;
      const rawRank = nftCard?.rank ?? card.rank;
      return {
        id: card.id,
        user_id: card.user_id,
        nft_card_id: card.nft_card_id,
        suit: normalizeSuitToken(String(rawSuit ?? '')),
        rank: normalizeRankToken(rawRank as string | number),
        rarity: nftCard?.rarity || 'common',
        image_url: nftCard?.image_url || card.image_url,
        metadata: nftCard?.metadata || null,
        created_at: card.created_at || new Date().toISOString(),
        nft_card: nftCard,
      };
    }) || [];

    const response = NextResponse.json({
      success: true,
      deck,
      total: deck.length
    });
    
    // ✅ УСТАНАВЛИВАЕМ ЗАГОЛОВКИ ДЛЯ ОТКЛЮЧЕНИЯ КЭШИРОВАНИЯ
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error: unknown) {
    console.error('❌ [GET DECK] Ошибка:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}

// 🗑️ DELETE: Удалить карту из колоды
export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { dbUserId: userId, user: dbUser } = await getUserIdFromDatabase(
      auth.userId,
      auth.environment
    );
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    const ownerIds = deckOwnerIds(userId, dbUser?.telegram_id);
    const body = await request.json();
    const { deckCardId } = body; // ID записи в _pidr_user_nft_deck

    if (!deckCardId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Deck card ID обязателен' 
      }, { status: 400 });
    }

    console.log(`🗑️ [DELETE FROM DECK] Удаление карты ${deckCardId} из колоды пользователя ${userId}`);

    // УДАЛЯЕМ КАРТУ ИЗ КОЛОДЫ
    const { error } = await supabaseAdmin
      .from('_pidr_user_nft_deck')
      .delete()
      .eq('id', deckCardId)
      .in('user_id', ownerIds);

    if (error) {
      console.error('❌ [DELETE FROM DECK] Ошибка:', error);
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }

    console.log(`✅ [DELETE FROM DECK] Карта ${deckCardId} удалена из колоды`);

    return NextResponse.json({
      success: true,
      message: 'Карта удалена из колоды'
    });

  } catch (error: unknown) {
    console.error('❌ [DELETE FROM DECK] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

