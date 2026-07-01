import { NextResponse } from 'next/server';
import { getEmbeddedBuildId } from '@/lib/app-version/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/app/version — актуальный build id деплоя (без кэша) */
export async function GET() {
  const buildId = getEmbeddedBuildId();
  const deployedAt = process.env.VERCEL_DEPLOYMENT_CREATED_AT || null;

  return NextResponse.json(
    { buildId, deployedAt },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'X-App-Build-Id': buildId,
      },
    }
  );
}
