import { NextRequest, NextResponse } from 'next/server';
import { getYooKassaPaymentStatus } from '@/lib/payments/yookassa';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { activatePremium, getPremiumStatus } from '@/lib/premium/premium-service';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/yookassa/status?payment_id=xxx
 * Получить статус платежа
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let paymentId = searchParams.get('payment_id');
    const orderId = searchParams.get('order_id');

    if (!paymentId && orderId) {
      const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
      const { data } = await supabaseAdmin
        .from('_pidr_payments')
        .select('payment_id')
        .eq('order_id', orderId)
        .eq('user_id', dbUserId || 0)
        .maybeSingle();
      paymentId = data?.payment_id || null;
    }

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: 'payment_id или order_id обязателен' },
        { status: 400 }
      );
    }

    const payment = await getYooKassaPaymentStatus(paymentId);

    if (!payment) {
      return NextResponse.json(
        { success: false, message: 'Платеж не найден' },
        { status: 404 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    const { data: localPayment } = await supabaseAdmin
      .from('_pidr_payments')
      .select('item_type')
      .eq('payment_id', paymentId)
      .eq('user_id', dbUserId || 0)
      .maybeSingle();

    const itemType = localPayment?.item_type || payment.metadata?.itemType || 'coins';

    let premium = null;
    if (payment.status === 'succeeded' && itemType === 'premium' && dbUserId) {
      premium = await getPremiumStatus(dbUserId);
      if (!premium.isPremium) {
        try {
          await activatePremium({
            userId: dbUserId,
            source: 'yookassa',
            paymentId: payment.id,
            amountPaidRub: parseFloat(payment.amount.value),
          });
          premium = await getPremiumStatus(dbUserId);
        } catch (err) {
          console.error('❌ Premium fallback activation failed:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount.value,
        currency: payment.amount.currency,
        description: payment.description,
        createdAt: payment.created_at,
        itemType,
      },
      premium,
    });

  } catch (error: any) {
    console.error('❌ Error getting payment status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

