import { NextRequest, NextResponse } from 'next/server';
import { refreshExchangeRates } from '@/lib/pricing/exchange-rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ежедневное обновление курсов (CoinGecko + ЦБ РФ) */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await refreshExchangeRates();
    console.log('💱 [CRON] Exchange rates updated:', snapshot.updatedAt, snapshot.source);
    return NextResponse.json({
      success: true,
      updatedAt: snapshot.updatedAt,
      source: snapshot.source,
      usdRub: snapshot.usdRub,
      coinsPerUsd: snapshot.coinsPerUsd,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    console.error('❌ [CRON] Exchange rates failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
