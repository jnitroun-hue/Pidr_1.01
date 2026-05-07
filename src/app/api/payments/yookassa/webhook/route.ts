import { NextRequest, NextResponse } from 'next/server';
import { getYooKassaPaymentStatus, captureYooKassaPayment, verifyYooKassaWebhook } from '@/lib/payments/yookassa';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * POST /api/payments/yookassa/webhook
 * Webhook для обработки уведомлений от YooKassa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-yookassa-signature') || '';

    // Проверяем подпись (в продакшене обязательно!)
    // const isValid = verifyYooKassaWebhook(JSON.stringify(body), signature);
    // if (!isValid) {
    //   return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
    // }

    const event = body.event;
    const payment = body.object;

    console.log(`🔔 YooKassa webhook: ${event} for payment ${payment.id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Обрабатываем разные события
    switch (event) {
      case 'payment.succeeded':
        // Платеж успешно завершен
        await handlePaymentSucceeded(supabase, payment);
        break;

      case 'payment.waiting_for_capture':
        // Платеж ожидает подтверждения
        await handlePaymentWaitingForCapture(supabase, payment);
        break;

      case 'payment.canceled':
        // Платеж отменен
        await handlePaymentCanceled(supabase, payment);
        break;

      default:
        console.log(`⚠️ Unknown YooKassa event: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error processing YooKassa webhook:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Обработка успешного платежа
 */
async function handlePaymentSucceeded(supabase: any, payment: any) {
  const metadata = payment.metadata || {};
  const userId = metadata.userId;
  const itemId = metadata.itemId;
  const itemType = metadata.itemType;
  const amount = parseFloat(payment.amount.value);

  if (!userId) {
    console.error('❌ No userId in payment metadata');
    return;
  }

  console.log(`✅ Payment succeeded: ${payment.id} for user ${userId}, amount: ${amount} RUB`);

  // Сохраняем информацию о платеже в БД
  const { error: paymentError } = await supabase
    .from('_pidr_payments')
    .insert({
      payment_id: payment.id,
      user_id: userId,
      amount: amount,
      currency: payment.amount.currency,
      status: 'succeeded',
      item_id: itemId,
      item_type: itemType,
      metadata: metadata,
      created_at: new Date().toISOString()
    });

  if (paymentError) {
    console.error('❌ Error saving payment:', paymentError);
  }

  // Обрабатываем покупку в зависимости от типа
  if (itemType === 'coins') {
    // Добавляем монеты пользователю
    const { data: user } = await supabase
      .from('_pidr_users')
      .select('coins')
      .eq('id', userId)
      .single();

    if (user) {
      const coinsToAdd = Math.floor(amount * 50); // 50 монет за 1 рубль (100 руб = 5000 монет)
      const newBalance = (user.coins || 0) + coinsToAdd;

      await supabase
        .from('_pidr_users')
        .update({ coins: newBalance })
        .eq('id', userId);

      // Записываем транзакцию монет
      await supabase
        .from('_pidr_coin_transactions')
        .insert({
          user_id: parseInt(userId) || 0,
          amount: coinsToAdd,
          transaction_type: 'deposit_rub',
          description: `Пополнение через ЮКассу: ${amount} ₽ → ${coinsToAdd} монет`,
          balance_before: user.coins || 0,
          balance_after: newBalance,
          status: 'completed'
        });

      console.log(`💰 Добавлено ${coinsToAdd} монет пользователю ${userId} (${amount} ₽), новый баланс: ${newBalance}`);
    }
  } else if (itemType === 'nft_listing') {
    const listingId = parseInt(metadata.listingId || metadata.itemId, 10);
    const buyerDbUserId = parseInt(metadata.buyerDbUserId || userId, 10);
    const paidRub = parseFloat(payment.amount.value);

    if (!listingId || !buyerDbUserId) {
      console.error('❌ nft_listing: нет listingId или buyerDbUserId', metadata);
      return;
    }

    const { data: listing, error: le } = await supabase
      .from('_pidr_nft_marketplace')
      .select('id, status, seller_user_id, nft_card_id, price_rub')
      .eq('id', listingId)
      .single();

    if (le || !listing || listing.status !== 'active') {
      console.error('❌ nft_listing: лот не найден или неактивен', le);
      return;
    }

    if (listing.seller_user_id === buyerDbUserId) {
      console.error('❌ nft_listing: покупатель = продавец');
      return;
    }

    const expected = Number(listing.price_rub);
    if (!expected || Math.abs(expected - paidRub) > 0.05) {
      console.error(`❌ nft_listing: сумма не совпадает (ожид. ${expected}, оплата ${paidRub})`);
      return;
    }

    const { error: transferErr } = await supabase
      .from('_pidr_nft_cards')
      .update({ user_id: buyerDbUserId, updated_at: new Date().toISOString() })
      .eq('id', listing.nft_card_id);

    if (transferErr) {
      console.error('❌ nft_listing: ошибка переноса NFT', transferErr);
      return;
    }

    const { error: updErr } = await supabase
      .from('_pidr_nft_marketplace')
      .update({
        status: 'sold',
        buyer_user_id: buyerDbUserId,
        sold_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    if (updErr) {
      console.error('❌ nft_listing: ошибка обновления лота', updErr);
      return;
    }

    console.log(`✅ nft_listing: лот ${listingId} продан пользователю ${buyerDbUserId}`);
  } else if (itemType === 'premium' || itemType === 'item') {
    // Обработка покупки премиум-функций или предметов
    // TODO: Реализовать логику активации премиум/предметов
    console.log(`🎁 Processing ${itemType} purchase for user ${userId}`);
  }
}

/**
 * Обработка платежа, ожидающего подтверждения
 */
async function handlePaymentWaitingForCapture(supabase: any, payment: any) {
  console.log(`⏳ Payment waiting for capture: ${payment.id}`);
  
  // Автоматически подтверждаем платеж
  const captured = await captureYooKassaPayment(payment.id);
  if (captured) {
    console.log(`✅ Payment captured: ${payment.id}`);
  }
}

/**
 * Обработка отмененного платежа
 */
async function handlePaymentCanceled(supabase: any, payment: any) {
  const metadata = payment.metadata || {};
  const userId = metadata.userId;

  console.log(`❌ Payment canceled: ${payment.id} for user ${userId}`);

  // Сохраняем информацию об отмене
  const { error } = await supabase
    .from('_pidr_payments')
    .insert({
      payment_id: payment.id,
      user_id: userId,
      amount: parseFloat(payment.amount.value),
      currency: payment.amount.currency,
      status: 'canceled',
      metadata: metadata,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('❌ Error saving canceled payment:', error);
  }
}

