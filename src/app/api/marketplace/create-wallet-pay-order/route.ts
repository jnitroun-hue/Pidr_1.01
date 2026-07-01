import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin, getSupabaseAdmin } from '@/lib/supabase';
import {
  createWalletPayOrder,
  isWalletPayConfigured,
} from '@/lib/wallets/wallet-pay-api';
import { buildWalletPayAmount } from '@/lib/wallets/wallet-pay-currencies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildReturnUrl(): string {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME;
  const app = process.env.NEXT_PUBLIC_TELEGRAM_MINIAPP_NAME || 'start';
  if (bot) return `https://t.me/${bot}/${app}`;
  return `${process.env.NEXT_PUBLIC_APP_URL || ''}/shop`;
}

/** POST /api/marketplace/create-wallet-pay-order — NFT через Telegram Wallet (одно подтверждение) */
export async function POST(request: NextRequest) {
  try {
    if (!isWalletPayConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Wallet Pay не настроен', fallback: true },
        { status: 503 }
      );
    }

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId || !dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const telegramUserId = Number(dbUser.telegram_id || auth.userId);
    if (!Number.isFinite(telegramUserId) || telegramUserId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Доступно только в Telegram Mini App' },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();
    if (!db) {
      return NextResponse.json({ success: false, error: 'DB unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const listingId = Number(body.listing_id);
    const coin = String(body.coin || 'USDT').toUpperCase();

    if (!listingId || Number.isNaN(listingId)) {
      return NextResponse.json({ success: false, error: 'listing_id обязателен' }, { status: 400 });
    }

    const { data: listing, error: listErr } = await db
      .from('_pidr_nft_marketplace')
      .select('id, status, seller_user_id, price_rub, price_ton, price_sol, nft_card_id')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      return NextResponse.json({ success: false, error: 'Лот не найден' }, { status: 404 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Лот не активен' }, { status: 400 });
    }

    if (listing.seller_user_id === dbUserId) {
      return NextResponse.json({ success: false, error: 'Нельзя купить свой лот' }, { status: 400 });
    }

    let payAmount: ReturnType<typeof buildWalletPayAmount>;
    let description = `NFT лот #${listingId}`;

    if (listing.price_ton && Number(listing.price_ton) > 0) {
      payAmount = buildWalletPayAmount('TON', Number(listing.price_ton));
      description = `NFT за ${listing.price_ton} GRAM/TON`;
    } else if (listing.price_rub && Number(listing.price_rub) > 0) {
      const rub = Number(listing.price_rub);
      const rubPerUsd = Number(process.env.RUB_PER_USD || '100');
      const usd = Math.max(rub / rubPerUsd, 1.31);
      payAmount = { currencyCode: 'USD', amount: usd.toFixed(2) };
      description = `NFT за ${rub.toLocaleString('ru-RU')} ₽`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Лот не продаётся за крипту/₽ через Wallet Pay' },
        { status: 400 }
      );
    }

    const externalId = `pidr-nft-${listingId}-${dbUserId}-${Date.now()}`;

    const result = await createWalletPayOrder({
      amount: payAmount,
      description: description.slice(0, 100),
      externalId,
      timeoutSeconds: 3600,
      customerTelegramUserId: telegramUserId,
      returnUrl: buildReturnUrl(),
      failReturnUrl: 'https://t.me/wallet',
      customData: JSON.stringify({
        itemType: 'nft_listing',
        listingId,
        buyerDbUserId: dbUserId,
        userId: dbUserId,
        coin,
      }),
      autoConversionCurrency: payAmount.autoConversionCurrency,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    await supabaseAdmin.from('_pidr_wallet_pay_orders').insert({
      external_id: externalId,
      wallet_pay_order_id: result.order.id,
      user_id: dbUserId,
      telegram_user_id: telegramUserId,
      coin,
      crypto_amount: listing.price_ton || listing.price_rub || 0,
      game_coins: 0,
      status: 'pending',
      pay_link: result.payLink,
      order_type: 'nft_listing',
      listing_id: listingId,
    });

    return NextResponse.json({
      success: true,
      payLink: result.payLink,
      externalId,
      message: 'Подтвердите оплату в Telegram Wallet',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
