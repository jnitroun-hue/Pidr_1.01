import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis/init';

export const dynamic = 'force-dynamic';

const STATE_TTL_SEC = 180;

function stateKey(roomId: string) {
  return `mp:room:${roomId}:game_state`;
}

/** POST — хост кладёт снимок партии (если Realtime broadcast не дошёл) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'state обязателен' }, { status: 400 });
    }

    const snapshot = {
      ...body,
      timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
    };

    const redis = getRedis();
    if (redis) {
      await redis.set(stateKey(roomId), snapshot, { ex: STATE_TTL_SEC });
    }

    return NextResponse.json({ success: true, stored: Boolean(redis) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET — гость забирает последний снимок хоста */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ success: true, state: null });
    }

    const state = await redis.get<Record<string, unknown>>(stateKey(roomId));
    return NextResponse.json({ success: true, state: state ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
