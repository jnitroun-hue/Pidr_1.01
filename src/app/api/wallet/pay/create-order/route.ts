import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createWalletPayOrder,
  isWalletPayConfigured,
} from '@/lib/wallets/wallet-pay-api';
import {
  buildWalletPayAmount,
  gameCoinsForDeposit,
  walletPayMinAmountHint,
} from '@/lib/wallets/wallet-pay-currencies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildReturnUrl(): string {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME;
  const app = process.env.NEXT_PUBLIC_TELEGRAM_MINIAPP_NAME || 'start';
  if (bot) {
    return `https://t.me/${bot}/${app}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://t.me/wallet';
}

/** POST /api/wallet/pay/create-order — Jetton-style оплата через @wallet */
export async function POST(request: NextRequest) {
  try {
    if (!isWalletPayConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet Pay не настроен. Добавьте WALLET_PAY_API_KEY в Vercel (pay.wallet.tg).',
          fallback: true,
        },
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
        {
          success: false,
          error: 'Оплата через Telegram Wallet доступна только в Telegram Mini App',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const coin = String(body.coin || 'USDT').toUpperCase();
    const amount = parseFloat(String(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Некорректная сумма' }, { status: 400 });
    }

    const gameCoins = gameCoinsForDeposit(coin, amount);
    if (gameCoins <= 0) {
      return NextResponse.json({ success: false, error: 'Слишком маленькая сумма' }, { status: 400 });
    }

    const payAmount = buildWalletPayAmount(coin, amount);
    const externalId = `pidr-dep-${dbUserId}-${Date.now()}`;

    const result = await createWalletPayOrder({
      amount: payAmount,
      description: `Пополнение ${gameCoins.toLocaleString('ru-RU')} монет`,
      externalId,
      timeoutSeconds: 3600,
      customerTelegramUserId: telegramUserId,
      returnUrl: buildReturnUrl(),
      failReturnUrl: 'https://t.me/wallet',
      customData: JSON.stringify({
        userId: dbUserId,
        coin,
        cryptoAmount: amount,
        gameCoins,
      }),
      autoConversionCurrency: payAmount.autoConversionCurrency,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    const { error: insertError } = await supabaseAdmin.from('_pidr_wallet_pay_orders').insert({
      external_id: externalId,
      wallet_pay_order_id: result.order.id,
      user_id: dbUserId,
      telegram_user_id: telegramUserId,
      coin,
      crypto_amount: amount,
      game_coins: gameCoins,
      status: 'pending',
      pay_link: result.payLink,
    });

    if (insertError && insertError.code !== '42P01') {
      console.warn('⚠️ [wallet/pay] order insert:', insertError.message);
    }

    return NextResponse.json({
      success: true,
      payLink: result.payLink,
      externalId,
      gameCoins,
      coin,
      minHint: walletPayMinAmountHint(coin),
      message: 'Подтвердите оплату в Telegram Wallet',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET — проверка доступности Wallet Pay */
export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isWalletPayConfigured(),
  });
}
