/**
 * POST /api/marketplace/confirm-crypto
 * Complete pending crypto marketplace purchase after TON payment to seller wallet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { verifyTonIncomingPayment } from '@/lib/nft/ton-payment-verify';
import { GRAM } from '@/lib/crypto/gram-brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const { dbUserId: buyerId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!buyerId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const db = getSupabaseAdmin();
    if (!db) {
      return NextResponse.json({ success: false, error: 'БД недоступна' }, { status: 503 });
    }

    const body = await request.json();
    const { listing_id, paymentId, transactionHash, sinceUnix } = body;

    if (!listing_id) {
      return NextResponse.json({ success: false, error: 'listing_id обязателен' }, { status: 400 });
    }

    const { data: listing, error: listingError } = await db
      .from('_pidr_nft_marketplace')
      .select('*, nft_card:_pidr_nft_cards(*)')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ success: false, error: 'Лот не найден' }, { status: 404 });
    }

    if (listing.status === 'sold') {
      return NextResponse.json({
        success: true,
        message: 'Лот уже продан',
        card: listing.nft_card,
        alreadySold: true,
      });
    }

    if (listing.status !== 'pending' && listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Лот в статусе ${listing.status}, оплата невозможна` },
        { status: 400 }
      );
    }

    if (listing.buyer_user_id && listing.buyer_user_id !== buyerId) {
      return NextResponse.json(
        { success: false, error: 'Лот зарезервирован другим покупателем' },
        { status: 403 }
      );
    }

    const priceTon = Number(listing.price_ton || 0);
    const priceSol = Number(listing.price_sol || 0);
    if (!priceTon && !priceSol) {
      return NextResponse.json(
        { success: false, error: 'Лот не продаётся за криптовалюту' },
        { status: 400 }
      );
    }

    const cryptoCurrency = priceTon ? 'TON' : 'SOL';
    const price = priceTon || priceSol;
    const memo =
      paymentId || `NFT_${listing_id}_from_${buyerId}`;

    const walletType = cryptoCurrency.toLowerCase();
    const { data: sellerWallet } = await db
      .from('_pidr_player_wallets')
      .select('wallet_address')
      .eq('user_id', listing.seller_user_id)
      .or(`wallet_type.eq.${walletType},coin_type.eq.${walletType}`)
      .eq('is_active', true)
      .maybeSingle();

    if (!sellerWallet?.wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Кошелёк продавца не подключён' },
        { status: 400 }
      );
    }

    if (cryptoCurrency === 'SOL') {
      return NextResponse.json(
        { success: false, error: `Подтверждение SOL пока не реализовано — используйте монеты или ${GRAM.symbol}` },
        { status: 501 }
      );
    }

    const verify = await verifyTonIncomingPayment({
      toAddress: sellerWallet.wallet_address,
      minAmountTon: price * 0.99,
      commentContains: memo,
      txHash: transactionHash,
      sinceUnix: sinceUnix || Math.floor(Date.now() / 1000) - 3600,
    });

    if (!verify.ok) {
      return NextResponse.json(
        {
          success: false,
          code: 'PAYMENT_PENDING',
          error: verify.error || 'Платёж продавцу ещё не виден в блокчейне',
        },
        { status: 402 }
      );
    }

    if (verify.txHash) {
      const { data: dup } = await db
        .from('_pidr_crypto_transactions')
        .select('id')
        .eq('transaction_hash', verify.txHash)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { success: false, error: 'Транзакция уже обработана' },
          { status: 409 }
        );
      }
    }

    const { error: transferError } = await db
      .from('_pidr_nft_cards')
      .update({ user_id: buyerId, updated_at: new Date().toISOString() })
      .eq('id', listing.nft_card_id);

    if (transferError) {
      return NextResponse.json(
        { success: false, error: 'Ошибка переноса карты' },
        { status: 500 }
      );
    }

    await db
      .from('_pidr_nft_marketplace')
      .update({
        status: 'sold',
        buyer_user_id: buyerId,
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', listing_id);

    await db
      .from('_pidr_marketplace_transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('marketplace_listing_id', listing_id)
      .eq('buyer_user_id', buyerId);

    await db.from('_pidr_crypto_transactions').insert({
      user_id: buyerId,
      crypto_type: 'TON',
      transaction_hash: verify.txHash || null,
      payment_id: memo,
      wallet_address: sellerWallet.wallet_address,
      amount: verify.amountTon ?? price,
      purpose: `Marketplace buy listing #${listing_id}`,
      status: 'completed',
      metadata: { listing_id, seller_user_id: listing.seller_user_id },
    });

    return NextResponse.json({
      success: true,
      message: 'Покупка подтверждена',
      card: listing.nft_card,
    });
  } catch (error: unknown) {
    console.error('❌ [confirm-crypto]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
