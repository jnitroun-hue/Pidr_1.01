/**
 * POST /api/marketplace/create — выставить NFT на продажу
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { NFT_CARDS_TABLE, NFT_MARKETPLACE_TABLE } from '@/lib/nft/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSchemaCompatError(msg: string): boolean {
  return (
    msg.includes('fiat_payment_method') ||
    msg.includes('price_rub') ||
    msg.includes('views_count') ||
    msg.includes('crypto_currency') ||
    msg.includes('schema cache')
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    const db = getSupabaseAdmin();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'База данных недоступна' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const nftCardId = parseInt(String(body.nft_card_id), 10);
    const { price_coins, price_ton, price_sol, price_rub, fiat_payment_method } = body;

    if (!nftCardId || Number.isNaN(nftCardId)) {
      return NextResponse.json(
        { success: false, error: 'nft_card_id обязателен' },
        { status: 400 }
      );
    }

    const priceRubNum =
      price_rub !== undefined && price_rub !== null && price_rub !== ''
        ? Number(price_rub)
        : null;

    const hasPrice =
      (price_coins && Number(price_coins) > 0) ||
      (price_ton && Number(price_ton) > 0) ||
      (price_sol && Number(price_sol) > 0) ||
      (priceRubNum !== null && !Number.isNaN(priceRubNum) && priceRubNum > 0);

    if (!hasPrice) {
      return NextResponse.json(
        { success: false, error: 'Укажите цену (монеты, TON, SOL или ₽)' },
        { status: 400 }
      );
    }

    if (priceRubNum !== null && !Number.isNaN(priceRubNum) && priceRubNum > 0) {
      if (price_coins || price_ton || price_sol) {
        return NextResponse.json(
          { success: false, error: 'Для одного лота укажите только один тип цены' },
          { status: 400 }
        );
      }
    }

    const { data: nftCard, error: nftError } = await db
      .from(NFT_CARDS_TABLE)
      .select('id, user_id')
      .eq('id', nftCardId)
      .maybeSingle();

    if (nftError || !nftCard) {
      return NextResponse.json(
        { success: false, error: 'NFT карта не найдена' },
        { status: 404 }
      );
    }

    if (Number(nftCard.user_id) !== Number(dbUserId)) {
      return NextResponse.json(
        { success: false, error: 'Эта карта не принадлежит вам' },
        { status: 403 }
      );
    }

    const { data: existingListing } = await db
      .from(NFT_MARKETPLACE_TABLE)
      .select('id')
      .eq('nft_card_id', nftCardId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingListing) {
      return NextResponse.json(
        { success: false, error: 'Эта карта уже выставлена на продажу' },
        { status: 400 }
      );
    }

    const resolvedFiat =
      fiat_payment_method && ['bank_card', 'sbp', 'yoo_money', 'sberbank'].includes(fiat_payment_method)
        ? fiat_payment_method
        : 'bank_card';

    const insertRow: Record<string, unknown> = {
      nft_card_id: nftCardId,
      seller_user_id: dbUserId,
      status: 'active',
    };

    if (priceRubNum !== null && !Number.isNaN(priceRubNum) && priceRubNum > 0) {
      insertRow.price_rub = priceRubNum;
      insertRow.fiat_payment_method = resolvedFiat;
      insertRow.price_coins = null;
      insertRow.price_ton = null;
      insertRow.price_sol = null;
    } else if (price_coins && Number(price_coins) > 0) {
      insertRow.price_coins = Math.floor(Number(price_coins));
      insertRow.price_ton = null;
      insertRow.price_sol = null;
    } else if (price_ton && Number(price_ton) > 0) {
      insertRow.price_ton = Number(price_ton);
      insertRow.price_coins = null;
      insertRow.price_sol = null;
    } else if (price_sol && Number(price_sol) > 0) {
      insertRow.price_sol = Number(price_sol);
      insertRow.price_coins = null;
      insertRow.price_ton = null;
    }

    let { data: listing, error: insertError } = await db
      .from(NFT_MARKETPLACE_TABLE)
      .insert(insertRow)
      .select()
      .single();

    if (insertError && isSchemaCompatError(String(insertError.message || ''))) {
      const legacyRow: Record<string, unknown> = {
        nft_card_id: nftCardId,
        seller_user_id: dbUserId,
        status: 'active',
        price_coins: insertRow.price_coins ?? null,
        price_ton: insertRow.price_ton ?? null,
        price_sol: insertRow.price_sol ?? null,
      };
      const retry = await db.from(NFT_MARKETPLACE_TABLE).insert(legacyRow).select().single();
      listing = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error('❌ [Marketplace Create]', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          hint: isSchemaCompatError(String(insertError.message))
            ? 'Выполните supabase/migrations/0007_marketplace_rub.sql в Supabase'
            : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, listing });
  } catch (error: unknown) {
    console.error('❌ [Marketplace Create]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
