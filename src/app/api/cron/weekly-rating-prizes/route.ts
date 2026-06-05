import { NextRequest, NextResponse } from 'next/server';
import { distributeWeeklyRatingPrizes } from '@/lib/rating/distribute-weekly-prizes';
import { getPayoutWeekKey } from '@/lib/rating/weekly-prizes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/weekly-rating-prizes
 * Еженедельная раздача призов топ-10 рейтинга.
 *
 * Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-rating-prizes",
 *     "schedule": "0 0 * * 1"
 *   }]
 * }
 * Каждый понедельник 00:00 UTC — итоги прошедшей недели.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekKey = getPayoutWeekKey();
    console.log(`🏆 [CRON] Старт еженедельных призов рейтинга: ${weekKey}`);

    const result = await distributeWeeklyRatingPrizes(weekKey);

    return NextResponse.json({
      success: true,
      weekKey: result.weekKey,
      alreadyPaid: result.alreadyPaid,
      winners: result.winners,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ [CRON] weekly-rating-prizes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
