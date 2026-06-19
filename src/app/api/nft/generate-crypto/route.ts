/**
 * POST /api/nft/generate-crypto
 * Generate NFT card after verified TON payment (TonConnect or memo on master wallet).
 */

import { NextRequest, NextResponse } from 'next/server';
import { GRAM } from '@/lib/crypto/gram-brand';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import {
  verifyTonIncomingPayment,
  getMasterAddress,
} from '@/lib/nft/ton-payment-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRYPTO_COSTS: Record<string, number> = {
  pokemon: 0.5,
  halloween: 0.3,
  starwars: 0.3,
  legendary: 2,
};

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json();
    const {
      theme,
      suit,
      rank,
      imageData,
      themeId,
      action,
      crypto = 'TON',
      paymentId,
      transactionHash,
      expectedAmountTon,
      sinceUnix,
    } = body;

    if (crypto !== 'TON') {
      return NextResponse.json(
        { success: false, error: `Сейчас поддерживается только оплата ${GRAM.symbol}` },
        { status: 400 }
      );
    }

    if (!theme || !suit || !rank || !imageData || !paymentId) {
      return NextResponse.json(
        { success: false, error: 'theme, suit, rank, imageData и paymentId обязательны' },
        { status: 400 }
      );
    }

    const minTon =
      typeof expectedAmountTon === 'number'
        ? expectedAmountTon
        : CRYPTO_COSTS[theme] ?? 0.3;

    const masterAddress = getMasterAddress();
    if (!masterAddress) {
      return NextResponse.json(
        {
          success: false,
          code: 'TON_NOT_CONFIGURED',
          error: 'На сервере не задан MASTER_TON_ADDRESS',
        },
        { status: 503 }
      );
    }

    // Idempotency: already processed this payment_id
    const { data: existingPay } = await supabaseAdmin
      .from('_pidr_crypto_transactions')
      .select('id, metadata')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingPay?.metadata && (existingPay.metadata as { nft_card_id?: number }).nft_card_id) {
      const cardId = (existingPay.metadata as { nft_card_id: number }).nft_card_id;
      const { data: card } = await supabaseAdmin
        .from('_pidr_nft_cards')
        .select('*')
        .eq('id', cardId)
        .single();
      return NextResponse.json({
        success: true,
        message: 'Карта уже создана по этому платежу',
        nft: card,
        alreadyProcessed: true,
      });
    }

    const verify = await verifyTonIncomingPayment({
      toAddress: masterAddress,
      minAmountTon: minTon * 0.99,
      commentContains: paymentId,
      txHash: transactionHash,
      sinceUnix: sinceUnix || Math.floor(Date.now() / 1000) - 1200,
    });

    if (!verify.ok) {
      return NextResponse.json(
        {
          success: false,
          code: 'PAYMENT_PENDING',
          error: verify.error || `Платёж ещё не подтверждён в сети ${GRAM.networkLabel}`,
        },
        { status: 402 }
      );
    }

    if (verify.txHash) {
      const { data: dup } = await supabaseAdmin
        .from('_pidr_crypto_transactions')
        .select('id')
        .eq('transaction_hash', verify.txHash)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { success: false, error: 'Транзакция уже использована' },
          { status: 409 }
        );
      }
    }

    const origin = request.nextUrl.origin;
    const generateResponse = await fetch(`${origin}/api/nft/generate-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
        authorization: request.headers.get('authorization') || '',
        'x-telegram-id': request.headers.get('x-telegram-id') || '',
        'x-vk-id': request.headers.get('x-vk-id') || '',
        'x-auth-source': request.headers.get('x-auth-source') || '',
      },
      body: JSON.stringify({
        suit,
        rank,
        imageData,
        theme,
        themeId,
        action: action || `random_${theme}`,
        skipCoinDeduction: true,
      }),
    });

    const generateData = await generateResponse.json();
    if (!generateResponse.ok || !generateData.success) {
      return NextResponse.json(
        { success: false, error: generateData.error || 'Ошибка сохранения карты' },
        { status: 500 }
      );
    }

    await supabaseAdmin.from('_pidr_crypto_transactions').insert({
      user_id: userId,
      crypto_type: 'TON',
      transaction_hash: verify.txHash || transactionHash || null,
      payment_id: paymentId,
      wallet_address: verify.from || null,
      amount: verify.amountTon ?? minTon,
      purpose: `NFT Generation: ${theme} ${rank}${suit}`,
      status: 'completed',
      metadata: { nft_card_id: generateData.nft?.id, theme, paymentId },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Карта создана после оплаты ${GRAM.symbol}`,
      nft: generateData.nft,
    });
  } catch (error: unknown) {
    console.error('❌ [generate-crypto]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
