import { NextRequest, NextResponse } from 'next/server';
import { getYooKassaPaymentStatus, captureYooKassaPayment } from '@/lib/payments/yookassa';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/payments/yookassa/webhook
 * Webhook для обработки уведомлений от YooKassa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const configuredSecret = process.env.YOOKASSA_WEBHOOK_SECRET || '';
    const providedSecret = request.headers.get('x-webhook-secret') || request.nextUrl.searchParams.get('secret') || '';
    if (configuredSecret && providedSecret !== configuredSecret) {
      return NextResponse.json({ success: false, message: 'Invalid webhook secret' }, { status: 401 });
    }

    const event = body.event;
    const payment = body.object;

    console.log(`🔔 YooKassa webhook: ${event} for payment ${payment.id}`);

    const freshPayment = await getYooKassaPaymentStatus(payment.id);
    if (!freshPayment || freshPayment.status !== payment.status) {
      console.warn('⚠️ YooKassa webhook не подтвержден актуальным статусом API', {
        webhookStatus: payment.status,
        apiStatus: freshPayment?.status
      });
      return NextResponse.json({ success: false, message: 'Payment status verification failed' }, { status: 409 });
    }

    // Обрабатываем разные события
    switch (event) {
      case 'payment.succeeded':
        // Платеж успешно завершен
        await handlePaymentSucceeded(supabaseAdmin, freshPayment);
        break;

      case 'payment.waiting_for_capture':
        // Платеж ожидает подтверждения
        await handlePaymentWaitingForCapture(freshPayment);
        break;

      case 'payment.canceled':
        // Платеж отменен
        await handlePaymentCanceled(supabaseAdmin, freshPayment);
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

  const { data: existingPayment, error: existingError } = await supabase
    .from('_pidr_payments')
    .select('payment_id, status')
    .eq('payment_id', payment.id)
    .maybeSingle();

  if (!existingError && existingPayment?.status === 'succeeded') {
    console.log(`↩️ YooKassa payment ${payment.id} уже обработан, пропускаем повтор webhook`);
    return;
  }

  // Сохраняем/обновляем информацию о платеже в БД до начисления.
  const { error: paymentError } = await supabase
    .from('_pidr_payments')
    .upsert({
      payment_id: payment.id,
      order_id: metadata.orderId || null,
      user_id: parseInt(userId, 10) || null,
      amount: amount,
      currency: payment.amount.currency,
      status: 'processing',
      item_id: itemId,
      item_type: itemType,
      metadata: metadata,
      updated_at: new Date().toISOString()
    }, { onConflict: 'payment_id' });

  if (paymentError) {
    console.error('❌ Error saving payment before processing:', paymentError);
  }

  // Обрабатываем покупку в зависимости от типа
  if (itemType === 'coins') {
    // Добавляем монеты пользователю
    let userQuery = supabase
      .from('_pidr_users')
      .select('id, coins')
      .limit(1);

    const numericUserId = parseInt(userId, 10);
    if (!Number.isNaN(numericUserId)) {
      userQuery = userQuery.eq('id', numericUserId);
    } else if (metadata.authEnvironment === 'vk') {
      userQuery = userQuery.eq('vk_id', userId);
    } else {
      userQuery = userQuery.eq('telegram_id', userId);
    }

    const { data: user } = await userQuery.maybeSingle();

    if (user) {
      const coinsToAdd = Math.floor(amount * 50); // 50 монет за 1 рубль (100 руб = 5000 монет)
      const newBalance = (user.coins || 0) + coinsToAdd;

      await supabase
        .from('_pidr_users')
        .update({ coins: newBalance })
        .eq('id', user.id);

      // Записываем транзакцию монет
      await supabase
        .from('_pidr_coin_transactions')
        .insert({
          user_id: user.id,
          amount: coinsToAdd,
          transaction_type: 'deposit_rub',
          description: `Пополнение через ЮКассу: ${amount} ₽ → ${coinsToAdd} монет`,
          balance_before: user.coins || 0,
          balance_after: newBalance,
          status: 'completed'
        });

      console.log(`💰 Добавлено ${coinsToAdd} монет пользователю ${userId} (${amount} ₽), новый баланс: ${newBalance}`);
    } else {
      console.error('❌ YooKassa coins: пользователь не найден для начисления', metadata);
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
  } else if (itemType === 'premium') {
    const numericUserId = parseInt(String(userId), 10);
    let userQuery = supabase.from('_pidr_users').select('id');
    if (!Number.isNaN(numericUserId)) {
      userQuery = userQuery.eq('id', numericUserId);
    } else if (metadata.authEnvironment === 'vk') {
      userQuery = userQuery.eq('vk_id', userId);
    } else {
      userQuery = userQuery.eq('telegram_id', userId);
    }
    const { data: user } = await userQuery.maybeSingle();
    if (user?.id) {
      const { activatePremium } = await import('@/lib/premium/premium-service');
      await activatePremium({
        userId: user.id,
        source: 'yookassa',
        paymentId: payment.id,
        amountPaidRub: amount,
      });
      console.log(`👑 Premium activated for user ${user.id} via YooKassa`);
    }
  } else if (itemType === 'item') {
    console.log(`🎁 Processing item purchase for user ${userId}`);
  }

  await supabase
    .from('_pidr_payments')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString()
    })
    .eq('payment_id', payment.id);
}

/**
 * Обработка платежа, ожидающего подтверждения
 */
async function handlePaymentWaitingForCapture(payment: any) {
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
    .upsert({
      payment_id: payment.id,
      order_id: metadata.orderId || null,
      user_id: parseInt(userId, 10) || null,
      amount: parseFloat(payment.amount.value),
      currency: payment.amount.currency,
      status: 'canceled',
      metadata: metadata,
      updated_at: new Date().toISOString()
    }, { onConflict: 'payment_id' });

  if (error) {
    console.error('❌ Error saving canceled payment:', error);
  }
}

