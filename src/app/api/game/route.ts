import { NextRequest, NextResponse } from 'next/server';
// import { redis } from '../../../../lib/redis'; // Отключено для деплоя
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto'
import { checkRateLimit, getRateLimitId } from '../../../lib/ratelimit'

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BOT_USERNAME = process.env.BOT_USERNAME || '';
const APP_URL = process.env.APP_URL || '';
const BASE_URL = process.env.BASE_URL || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return String(payload.userId); // Приводим к строке для единообразия
  } catch {
    return null;
  }
}

function generateGameId() {
  try {
    return randomUUID();
  } catch {
    // Fallback for environments without randomUUID
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    return NextResponse.json({ success: false, message: 'Server misconfigured: JWT secret missing' }, { status: 500 });
  }

  // Rate limiting per requester
  const id = getRateLimitId(req);
  const { success } = await checkRateLimit(`game:create:${id}`);
  if (!success) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { withAI = false } = await req.json();

  const gameId = generateGameId();
  const game = {
    id: gameId,
    status: 'waiting',
    players: [{ userId, isBot: false }],
    deck: [],
    discardPile: [],
    withAI,
    gameStage: 'init',
    currentPlayerId: userId,
    startTime: new Date().toISOString(),
    gameData: {},
  };
  // await redis.set(`game:${gameId}`, JSON.stringify(game), { ex: 60 * 60 * 24 }); // Отключено для деплоя

  return NextResponse.json({ success: true, game });
} 