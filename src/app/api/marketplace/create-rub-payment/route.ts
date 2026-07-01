import { NextRequest, NextResponse } from 'next/server';
import { createYooKassaPayment } from '@/lib/payments/yookassa';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/create-rub-payment
 * Оплата NFT-лота в рублях через ЮКассу (после успешной оплаты webhook переносит карту покупателю).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Не авторизован' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const db = getSupabaseAdmin();
    if (!db) {
      return NextResponse.json({ success: false, error: 'База данных недоступна' }, { status: 503 });
    }

    const body = await request.json();
    const listingId = Number(body.listing_id);
    const paymentMethod = String(body.payment_method || body.paymentMethod || '').trim();

    if (!listingId || Number.isNaN(listingId)) {
      return NextResponse.json({ success: false, error: 'listing_id обязателен' }, { status: 400 });
    }

    const { data: listing, error: listErr } = await db
      .from('_pidr_nft_marketplace')
      .select('id, status, seller_user_id, nft_card_id, price_rub, fiat_payment_method')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      return NextResponse.json({ success: false, error: 'Лот не найден' }, { status: 404 });
    }

    if (listing.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Лот не активен' }, { status: 400 });
    }

    if (!listing.price_rub || Number(listing.price_rub) <= 0) {
      return NextResponse.json({ success: false, error: 'У лота нет цены в ₽' }, { status: 400 });
    }

    if (listing.seller_user_id === dbUserId) {
      return NextResponse.json({ success: false, error: 'Нельзя купить свой лот' }, { status: 400 });
    }

    const allowedMethods = ['bank_card', 'sberbank', 'yoo_money', 'sbp'] as const;
    const pmFromBody = allowedMethods.includes(paymentMethod as (typeof allowedMethods)[number])
      ? (paymentMethod as (typeof allowedMethods)[number])
      : null;
    const pm = pmFromBody || listing.fiat_payment_method || 'bank_card';

    if (!allowedMethods.includes(pm as (typeof allowedMethods)[number])) {
      return NextResponse.json({ success: false, error: 'Недопустимый способ оплаты' }, { status: 400 });
    }
    const amountStr = Number(listing.price_rub).toFixed(2);

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?payment_id={PAYMENT_ID}`;

    const payment = await createYooKassaPayment({
      amount: {
        value: amountStr,
        currency: 'RUB',
      },
      description: `Покупка NFT, лот #${listingId}`,
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      metadata: {
        userId: String(dbUserId),
        itemType: 'nft_listing',
        itemId: String(listingId),
        listingId: String(listingId),
        buyerDbUserId: String(dbUserId),
      },
      payment_method_data: {
        type: pm,
      },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Не удалось создать платёж' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
        amount: payment.amount.value,
        paymentMethod: pm,
      },
    });
  } catch (e: unknown) {
    console.error('❌ [create-rub-payment]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
