import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyWalletPayWebhook } from '@/lib/wallets/wallet-pay-api';
import { fulfillNftListingPurchase } from '@/lib/marketplace/fulfill-listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WebhookEvent = {
  eventId?: string;
  type?: string;
  payload?: {
    id?: string;
    externalId?: string;
    status?: string;
    customData?: string;
  };
};

type CustomData = {
  userId?: number;
  gameCoins?: number;
  coin?: string;
  cryptoAmount?: number;
  itemType?: string;
  listingId?: number;
  buyerDbUserId?: number;
};

async function processWalletPayOrder(params: {
  externalId: string;
  eventId?: string;
  customData?: string;
}): Promise<void> {
  const { externalId, eventId, customData } = params;

  let parsed: CustomData = {};
  if (customData) {
    try {
      parsed = JSON.parse(customData) as CustomData;
    } catch {
      /* use DB row */
    }
  }

  const { data: orderRow } = await supabaseAdmin
    .from('_pidr_wallet_pay_orders')
    .select('*')
    .eq('external_id', externalId)
    .maybeSingle();

  if (orderRow?.status === 'paid') return;
  if (eventId && orderRow?.webhook_event_id === eventId) return;

  const orderType = orderRow?.order_type || (parsed.itemType === 'nft_listing' ? 'nft_listing' : 'deposit');
  const itemType = parsed.itemType || (orderType === 'nft_listing' ? 'nft_listing' : 'deposit');

  if (itemType === 'nft_listing') {
    const listingId = parsed.listingId ?? orderRow?.listing_id;
    const buyerDbUserId = parsed.buyerDbUserId ?? parsed.userId ?? orderRow?.user_id;

    if (!listingId || !buyerDbUserId) {
      console.error('❌ [wallet/pay/webhook] nft_listing: missing ids', externalId);
      return;
    }

    const result = await fulfillNftListingPurchase(supabaseAdmin, {
      listingId: Number(listingId),
      buyerDbUserId: Number(buyerDbUserId),
    });

    if (!result.ok) {
      console.error('❌ [wallet/pay/webhook] nft_listing:', result.error);
      return;
    }

    if (orderRow) {
      await supabaseAdmin
        .from('_pidr_wallet_pay_orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          webhook_event_id: eventId || null,
        })
        .eq('external_id', externalId);
    }

    console.log(`✅ [wallet/pay/webhook] NFT listing ${listingId} → user ${buyerDbUserId}`);
    return;
  }

  let userId: number | null = parsed.userId ?? null;
  let gameCoins = parsed.gameCoins ?? 0;
  let coin = parsed.coin ?? 'USDT';
  let cryptoAmount = parsed.cryptoAmount ?? 0;

  if (orderRow) {
    userId = userId ?? orderRow.user_id;
    gameCoins = gameCoins || Number(orderRow.game_coins);
    coin = coin || orderRow.coin;
    cryptoAmount = cryptoAmount || Number(orderRow.crypto_amount);
  }

  if (!userId || gameCoins <= 0) {
    console.error('❌ [wallet/pay/webhook] cannot resolve deposit order', externalId);
    return;
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('_pidr_users')
    .select('id, coins')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.error('❌ [wallet/pay/webhook] user not found', userId);
    return;
  }

  const currentCoins = Number(user.coins || 0);
  const newBalance = currentCoins + gameCoins;

  await supabaseAdmin
    .from('_pidr_users')
    .update({ coins: newBalance, updated_at: new Date().toISOString() })
    .eq('id', userId);

  await supabaseAdmin.from('_pidr_coin_transactions').insert({
    user_id: userId,
    amount: gameCoins,
    transaction_type: 'deposit',
    description: `Telegram Wallet Pay: ${cryptoAmount} ${coin}`,
    balance_before: currentCoins,
    balance_after: newBalance,
  });

  await supabaseAdmin.from('_pidr_crypto_transactions').insert({
    user_id: userId,
    coin_type: coin.toLowerCase(),
    amount: cryptoAmount,
    transaction_type: 'deposit',
    status: 'completed',
    tx_hash: eventId || externalId,
    metadata: { source: 'wallet_pay', externalId },
  });

  if (orderRow) {
    await supabaseAdmin
      .from('_pidr_wallet_pay_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        webhook_event_id: eventId || null,
      })
      .eq('external_id', externalId);
  }

  console.log(`✅ [wallet/pay/webhook] +${gameCoins} coins for user ${userId}`);
}

/** POST /api/wallet/pay/webhook */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('WalletPay-Timestamp') || request.headers.get('Walletpay-Timestamp') || '';
  const signature = request.headers.get('WalletPay-Signature') || request.headers.get('Walletpay-Signature') || '';
  const path = '/api/wallet/pay/webhook';

  const valid = await verifyWalletPayWebhook({
    method: 'POST',
    path,
    timestamp,
    rawBody,
    signature,
  });

  if (!valid) {
    console.warn('⚠️ [wallet/pay/webhook] invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let events: WebhookEvent[] = [];
  try {
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  for (const event of events) {
    const type = event.type || '';
    if (type !== 'ORDER_PAID' && event.payload?.status !== 'PAID') continue;

    const externalId = event.payload?.externalId;
    if (!externalId) continue;

    try {
      await processWalletPayOrder({
        externalId,
        eventId: event.eventId,
        customData: event.payload?.customData,
      });
    } catch (err) {
      console.error('❌ [wallet/pay/webhook] credit error:', err);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
