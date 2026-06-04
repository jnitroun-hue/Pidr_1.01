import { NextRequest, NextResponse } from 'next/server';
import { createYooKassaPayment } from '@/lib/payments/yookassa';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/yookassa/create
 * Создать платеж через YooKassa
 * 
 * Body: {
 *   amount: number, // Сумма в рублях
 *   description: string,
 *   itemId?: string,
 *   itemType?: 'coins' | 'premium' | 'item',
 *   paymentMethod?: 'bank_card' | 'sberbank' | 'yoo_money' | 'sbp'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, description, itemId, itemType = 'coins', paymentMethod } = body;

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 100) {
      return NextResponse.json(
        { success: false, message: 'Минимальная сумма пополнения: 100 ₽' },
        { status: 400 }
      );
    }

    if (!['coins', 'premium', 'item'].includes(itemType)) {
      return NextResponse.json(
        { success: false, message: 'Некорректный тип покупки' },
        { status: 400 }
      );
    }

    const allowedPaymentMethods = ['bank_card', 'sberbank', 'yoo_money', 'sbp'];
    const safePaymentMethod = allowedPaymentMethods.includes(paymentMethod) ? paymentMethod : undefined;
    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }

    const coins = itemType === 'coins' ? Math.round(normalizedAmount * 50) : 0;
    const orderId = `yk_${Date.now()}_${dbUserId}_${Math.random().toString(36).slice(2, 8)}`;
    const finalDescription = itemType === 'coins'
      ? `Пополнение баланса: ${coins.toLocaleString('ru-RU')} монет`
      : String(description || 'Покупка в P.I.D.R.');

    // Формируем URL для возврата после оплаты
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?order_id=${encodeURIComponent(orderId)}`;

    // Создаем платеж в YooKassa
    const payment = await createYooKassaPayment({
      amount: {
        value: normalizedAmount.toFixed(2),
        currency: 'RUB'
      },
      description: finalDescription,
      capture: true, // Автоматическое подтверждение
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      metadata: {
        userId: String(dbUserId),
        authUserId: auth.userId,
        authEnvironment: auth.environment,
        itemId: itemId ? String(itemId) : undefined,
        itemType,
        orderId,
        coins: coins ? String(coins) : undefined
      },
      payment_method_data: safePaymentMethod ? {
        type: safePaymentMethod as any
      } : undefined
    }, { idempotenceKey: orderId });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Ошибка создания платежа' },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from('_pidr_payments')
      .upsert({
        payment_id: payment.id,
        order_id: orderId,
        user_id: dbUserId,
        amount: normalizedAmount,
        currency: payment.amount.currency,
        status: payment.status,
        item_id: itemId ? String(itemId) : null,
        item_type: itemType,
        metadata: payment.metadata || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'payment_id' });

    if (insertError) {
      console.warn('⚠️ YooKassa pending payment не сохранен (проверьте _pidr_payments):', insertError);
    }

    console.log(`✅ YooKassa payment created: ${payment.id} for db user ${dbUserId}`);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        confirmationUrl: payment.confirmation.confirmation_url,
        amount: payment.amount.value,
        currency: payment.amount.currency,
        orderId
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating YooKassa payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

