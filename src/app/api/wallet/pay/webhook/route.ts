import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyWalletPayWebhook } from '@/lib/wallets/wallet-pay-api';

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

async function creditWalletPayOrder(params: {
  externalId: string;
  eventId?: string;
  customData?: string;
}): Promise<void> {
  const { externalId, eventId, customData } = params;

  let userId: number | null = null;
  let gameCoins = 0;
  let coin = 'USDT';
  let cryptoAmount = 0;

  if (customData) {
    try {
      const parsed = JSON.parse(customData) as {
        userId?: number;
        gameCoins?: number;
        coin?: string;
        cryptoAmount?: number;
      };
      userId = parsed.userId ?? null;
      gameCoins = parsed.gameCoins ?? 0;
      coin = parsed.coin ?? coin;
      cryptoAmount = parsed.cryptoAmount ?? 0;
    } catch {
      /* use DB row */
    }
  }

  const { data: orderRow } = await supabaseAdmin
    .from('_pidr_wallet_pay_orders')
    .select('*')
    .eq('external_id', externalId)
    .maybeSingle();

  if (orderRow) {
    if (orderRow.status === 'paid') return;
    userId = userId ?? orderRow.user_id;
    gameCoins = gameCoins || Number(orderRow.game_coins);
    coin = coin || orderRow.coin;
    cryptoAmount = cryptoAmount || Number(orderRow.crypto_amount);
  }

  if (!userId || gameCoins <= 0) {
    console.error('❌ [wallet/pay/webhook] cannot resolve order', externalId);
    return;
  }

  if (eventId && orderRow?.webhook_event_id === eventId) return;

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
      await creditWalletPayOrder({
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
