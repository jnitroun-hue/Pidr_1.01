import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '../../../lib/redis/init';
import { requireAuth, getUserIdFromDatabase } from '../../../lib/auth-utils';
import { checkRateLimit, getRateLimitId } from '../../../lib/ratelimit';
import { randomUUID } from 'crypto';

function generateGameId() {
  try {
    return randomUUID();
  } catch {
    // Fallback for environments without randomUUID
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting per requester
  const id = getRateLimitId(req);
  const { success: rateLimitOk } = await checkRateLimit(`game:create:${id}`);
  if (!rateLimitOk) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
  }

  // ✅ Универсальная авторизация
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { userId, environment } = auth;

  // Получаем пользователя из БД
  const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);
  if (!dbUserId || !user) {
    return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
  }

  try {
    const { withAI = false } = await req.json();

    const gameId = generateGameId();
    const game = {
      id: gameId,
      status: 'waiting',
      players: [{ userId: String(dbUserId), username: user.username || user.first_name || 'Игрок', isBot: false }],
      deck: [],
      discardPile: [],
      withAI,
      gameStage: 'init',
      currentPlayerId: String(dbUserId),
      startTime: new Date().toISOString(),
      gameData: {},
    };

    // ✅ Сохраняем в Redis (если доступен)
    const redis = getRedis();
    if (redis) {
      await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 60 * 60 * 24 }); // 24 часа TTL
      console.log(`✅ [Game] Игра ${gameId} сохранена в Redis`);
    } else {
      console.warn(`⚠️ [Game] Redis недоступен, игра ${gameId} создана без Redis`);
    }

    return NextResponse.json({ success: true, game });
  } catch (error: any) {
    console.error('❌ [Game] Ошибка создания игры:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
