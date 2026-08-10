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

  if (!orderRow) {
    console.error('❌ [wallet/pay/webhook] rejecting unknown deposit order', externalId);
    return;
  }
  if (!['TON', 'USDT', 'BTC'].includes(String(orderRow.coin || '').toUpperCase())) {
    console.error('❌ [wallet/pay/webhook] unsupported stored coin', orderRow.coin);
    return;
  }
  const { data: creditResult, error: creditError } = await supabaseAdmin.rpc(
    'credit_verified_wallet_pay_order',
    {
      p_external_id: externalId,
      p_event_id: eventId || '',
    }
  );
  if (creditError) {
    throw new Error(`Atomic Wallet Pay credit failed: ${creditError.message}`);
  }
  const result = Array.isArray(creditResult) ? creditResult[0] : creditResult;
  console.log(`✅ [wallet/pay/webhook] deposit ${externalId}: credited=${Boolean(result?.credited)}`);
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
