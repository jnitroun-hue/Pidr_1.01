import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { fulfillPaidNftGeneration } from '@/lib/nft/fulfill-paid-generation';
import { isNftThemeKey } from '@/lib/nft/theme-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json();
    const paymentId = String(body.paymentId || '').trim();
    const orderId = String(body.orderId || '').trim();
    if (!paymentId && !orderId) {
      return NextResponse.json({ success: false, error: 'paymentId или orderId обязателен' }, { status: 400 });
    }

    let query = supabaseAdmin.from('_pidr_payments').select('*').eq('user_id', dbUserId);
    if (paymentId) query = query.eq('payment_id', paymentId);
    else query = query.eq('order_id', orderId);

    const { data: payment, error } = await query.maybeSingle();
    if (error || !payment) {
      return NextResponse.json({ success: false, error: 'Платёж не найден' }, { status: 404 });
    }

    if (payment.item_type !== 'nft_generation') {
      return NextResponse.json({ success: false, error: 'Это не оплата генерации' }, { status: 400 });
    }

    if (payment.status !== 'succeeded' && payment.status !== 'processing') {
      return NextResponse.json(
        { success: false, code: 'PAYMENT_PENDING', error: 'Оплата ещё не подтверждена' },
        { status: 402 }
      );
    }

    const metadata = (payment.metadata || {}) as Record<string, unknown>;
    if (metadata.generationFulfilled) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        created: Number(metadata.generationCount) || 0,
      });
    }

    const theme = String(metadata.theme || '');
    const count = Number(metadata.qty || metadata.count || 1);
    if (!isNftThemeKey(theme)) {
      return NextResponse.json({ success: false, error: 'В платеже нет коллекции' }, { status: 400 });
    }

    const result = await fulfillPaidNftGeneration({ userId: dbUserId, theme, count });

    await supabaseAdmin
      .from('_pidr_payments')
      .update({
        status: 'succeeded',
        metadata: {
          ...metadata,
          generationFulfilled: true,
          generationCount: result.created,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment.payment_id);

    return NextResponse.json({
      success: true,
      created: result.created,
      nfts: result.nfts,
    });
  } catch (error: unknown) {
    console.error('❌ [fulfill-generation]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка генерации' },
      { status: 500 }
    );
  }
}
