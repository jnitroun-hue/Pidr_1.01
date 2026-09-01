/**
 * POST /api/nft/generate-crypto
 * Generate NFT card after verified crypto payment (GRAM/SOL/TRX/USDT).
 */

import { NextRequest, NextResponse } from 'next/server';
import { GRAM } from '@/lib/crypto/gram-brand';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { verifyGenerationCryptoPayment } from '@/lib/wallets/incoming-crypto-verify';
import { NFT_GEN_TON_COST, normalizeGenCrypto, isTonFamily } from '@/lib/nft/crypto-gen-costs';
import { cryptoAmountFromUsd, getCryptoUsdPrice, getExchangeRates } from '@/lib/pricing/exchange-rates';
import { resolveMasterAddress } from '@/lib/wallets/master-addresses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cryptoLabel(coin: string): string {
  return isTonFamily(coin) ? GRAM.symbol : coin.toUpperCase();
}

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
      crypto = 'GRAM',
      paymentId,
      transactionHash,
      expectedAmountTon,
      expectedAmount,
      sinceUnix,
      cards,
    } = body;

    const coin = normalizeGenCrypto(crypto);
    if (!coin) {
      return NextResponse.json(
        { success: false, error: 'Оплата генерации: GRAM, SOL, TRX или USDT' },
        { status: 400 }
      );
    }

    const cardBatch: Array<{ suit: string; rank: string; imageData: string; themeId?: number }> =
      Array.isArray(cards) && cards.length > 0
        ? cards
        : [{ suit, rank, imageData, themeId }];

    if (!theme || !paymentId || cardBatch.some((c) => !c.suit || !c.rank || !c.imageData)) {
      return NextResponse.json(
        { success: false, error: 'theme, paymentId и данные карт обязательны' },
        { status: 400 }
      );
    }

    const baseTon = (NFT_GEN_TON_COST[theme] ?? 0.3) * cardBatch.length;
    const rates = await getExchangeRates();
    const usd = baseTon * getCryptoUsdPrice('TON', rates);
    const computedAmount = isTonFamily(coin)
      ? baseTon
      : cryptoAmountFromUsd(coin, usd, rates);
    const minAmount =
      typeof expectedAmount === 'number' && expectedAmount > 0
        ? expectedAmount
        : typeof expectedAmountTon === 'number' && expectedAmountTon > 0 && isTonFamily(coin)
          ? expectedAmountTon
          : computedAmount;

    const master = isTonFamily(coin)
      ? resolveMasterAddress('GRAM') ?? resolveMasterAddress('TON')
      : resolveMasterAddress(coin);
    if (!master?.address) {
      return NextResponse.json(
        {
          success: false,
          code: 'CRYPTO_NOT_CONFIGURED',
          error: `На сервере не задан адрес для ${cryptoLabel(coin)}`,
        },
        { status: 503 }
      );
    }

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

    const verify = await verifyGenerationCryptoPayment({
      coin,
      minAmount,
      commentContains: paymentId,
      txHash: transactionHash,
      sinceUnix: sinceUnix || Math.floor(Date.now() / 1000) - 1200,
    });

    if (!verify.ok) {
      return NextResponse.json(
        {
          success: false,
          code: 'PAYMENT_PENDING',
          error: verify.error || `Платёж ещё не подтверждён (${cryptoLabel(coin)})`,
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
    const created = [];
    for (const card of cardBatch) {
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
          suit: card.suit,
          rank: card.rank,
          imageData: card.imageData,
          theme,
          themeId: card.themeId,
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
      created.push(generateData.nft);
    }

    await supabaseAdmin.from('_pidr_crypto_transactions').insert({
      user_id: userId,
      crypto_type: isTonFamily(coin) ? 'TON' : coin,
      transaction_hash: verify.txHash || transactionHash || null,
      payment_id: paymentId,
      wallet_address: verify.from || null,
      amount: verify.amountTon ?? minAmount,
      purpose: `NFT Generation: ${theme} x${created.length}`,
      status: 'completed',
      metadata: {
        nft_card_id: created[0]?.id,
        nft_card_ids: created.map((nft) => nft?.id).filter(Boolean),
        theme,
        paymentId,
        coin,
        count: created.length,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: created.length > 1
        ? `Создано ${created.length} карт после оплаты ${cryptoLabel(coin)}`
        : `Карта создана после оплаты ${cryptoLabel(coin)}`,
      nft: created[0],
      nfts: created,
      created: created.length,
    });
  } catch (error: unknown) {
    console.error('❌ [generate-crypto]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
