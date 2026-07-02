import { NextResponse } from 'next/server';
import { getExchangeRates, refreshExchangeRates } from '@/lib/pricing/exchange-rates';
import { isYooKassaConfigured } from '@/lib/payments/yookassa-config';
import { PRICING_TTL_SECONDS } from '@/lib/pricing/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/wallet/rates — курсы для UI и серверных расчётов */
export async function GET() {
  try {
    const snapshot = await getExchangeRates();
    return NextResponse.json({
      success: true,
      ...snapshot,
      yookassaEnabled: isYooKassaConfigured(),
      nextRefreshHint: `Обновление каждые ${PRICING_TTL_SECONDS / 3600} ч`,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load rates';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST — принудительное обновление (cron / admin) */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await refreshExchangeRates();
  return NextResponse.json({ success: true, ...snapshot });
}
