import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis/init';

export const dynamic = 'force-dynamic';

const MOVE_TTL_SEC = 30;
const MAX_MOVES_PER_POLL = 20;

function movesKey(roomId: string) {
  return `mp:room:${roomId}:pending_moves`;
}

/** POST — запасной канал хода (если Realtime broadcast не дошёл) */
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

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    if (!body?.type) {
      return NextResponse.json({ success: false, error: 'type обязателен' }, { status: 400 });
    }

    const move = {
      ...body,
      playerId: body.playerId != null ? String(body.playerId) : undefined,
      timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
      fromUserId: dbUserId,
    };

    const redis = getRedis();
    if (redis) {
      await redis.lpush(movesKey(roomId), JSON.stringify(move));
      await redis.expire(movesKey(roomId), MOVE_TTL_SEC);
    }

    return NextResponse.json({ success: true, queued: Boolean(redis) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET — хост забирает накопившиеся ходы */
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
      return NextResponse.json({ success: true, moves: [] });
    }

    const rawMoves: string[] = [];
    for (let i = 0; i < MAX_MOVES_PER_POLL; i++) {
      const item = await redis.rpop(movesKey(roomId));
      if (!item) break;
      rawMoves.push(typeof item === 'string' ? item : String(item));
    }

    const moves = rawMoves
      .map((raw) => {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, moves });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
