import { NextRequest, NextResponse } from 'next/server';
import { createYooKassaPayment } from '@/lib/payments/yookassa';
import { requireAuth } from '@/lib/auth-utils';

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
    // Проверяем авторизацию
    const auth = await requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, description, itemId, itemType, paymentMethod } = body;

    if (!amount || !description) {
      return NextResponse.json(
        { success: false, message: 'Сумма и описание обязательны' },
        { status: 400 }
      );
    }

    // Формируем URL для возврата после оплаты
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?payment_id={PAYMENT_ID}`;

    // Создаем платеж в YooKassa
    const payment = await createYooKassaPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB'
      },
      description,
      capture: true, // Автоматическое подтверждение
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      metadata: {
        userId: auth.userId,
        itemId,
        itemType,
        orderId: `order_${Date.now()}_${auth.userId}`
      },
      payment_method_data: paymentMethod ? {
        type: paymentMethod as any
      } : undefined
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Ошибка создания платежа' },
        { status: 500 }
      );
    }

    console.log(`✅ YooKassa payment created: ${payment.id} for user ${auth.userId}`);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        confirmationUrl: payment.confirmation.confirmation_url,
        amount: payment.amount.value,
        currency: payment.amount.currency
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

