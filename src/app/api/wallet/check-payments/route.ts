import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { tonPaymentService } from '@/lib/wallets/ton-payment-service';
import { resolveMasterAddress } from '@/lib/wallets/master-addresses';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/wallet/check-payments — проверка входящих GRAM/TON на MASTER_TON_ADDRESS */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  const userId = dbUserId ? String(dbUserId) : auth.userId;

  try {
    const tonMaster = resolveMasterAddress('GRAM') ?? resolveMasterAddress('TON');
    if (!tonMaster?.address) {
      return NextResponse.json({
        success: true,
        message: 'MASTER_TON_ADDRESS не настроен',
        newPayments: [],
      });
    }

    const result = await tonPaymentService.checkAndProcessPayments();
    const userPayments = result.newPayments.filter((p) => p.userId === userId);

    let newBalance: number | null = null;
    if (userPayments.length > 0) {
      const { data: userRow } = await supabaseAdmin
        .from('_pidr_users')
        .select('coins')
        .eq('id', userId)
        .single();
      newBalance = userRow?.coins ?? null;
    }

    return NextResponse.json({
      success: result.success,
      message: userPayments.length
        ? `Зачислено ${userPayments.length} платеж(ей)`
        : 'Новых платежей не найдено',
      newPayments: userPayments.map((p) => ({
        amount: p.amount,
        tonAmount: p.tonAmount,
        txHash: p.txHash,
        coin: 'TON',
      })),
      newBalance,
      configuredAddress: tonMaster.address,
      envKey: tonMaster.envKey,
    });
  } catch (error: unknown) {
    console.error('❌ Check payments error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Ошибка проверки платежей',
      },
      { status: 500 }
    );
  }
}
