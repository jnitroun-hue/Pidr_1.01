import { getRedis } from '@/lib/redis/init';
import type { Book } from './book';
import type { WalletMode } from './wallet';
import { changeBalance } from './wallet';

export type OpenRound = {
  spinId: string;
  gameId: string;
  mode: WalletMode;
  stake: number;
  baseBet: number;
  payout: number;
  capped: boolean;
  book: Book;
  settled: boolean;
  balance: number | null;
};

const openRounds = new Map<string, OpenRound>();
const replays = new Map<string, OpenRound>();
const locks = new Set<string>();

function openKey(userId: string): string {
  return `slots:open:${userId}`;
}

function replayKey(userId: string, spinId: string): string {
  return `slots:replay:${userId}:${spinId}`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
}

async function writeJson(key: string, value: unknown, ex: number): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.set(key, JSON.stringify(value), { ex });
}

export async function loadOpen(userId: string): Promise<OpenRound | null> {
  const local = openRounds.get(userId);
  if (local) return local;
  const stored = await readJson<OpenRound>(openKey(userId));
  if (stored) openRounds.set(userId, stored);
  return stored;
}

export async function saveOpen(userId: string, round: OpenRound): Promise<void> {
  openRounds.set(userId, round);
  await writeJson(openKey(userId), round, 900);
  replays.set(replayKey(userId, round.spinId), round);
  await writeJson(replayKey(userId, round.spinId), round, 60 * 60 * 24 * 7);
}

export async function loadReplay(userId: string, spinId: string): Promise<OpenRound | null> {
  const key = replayKey(userId, spinId);
  const local = replays.get(key);
  if (local) return local;
  const stored = await readJson<OpenRound>(key);
  if (stored) replays.set(key, stored);
  return stored;
}

async function clearOpen(userId: string): Promise<void> {
  openRounds.delete(userId);
  const redis = getRedis();
  if (redis) await redis.del(openKey(userId));
}

/** Один кассовый шаг на игрока: списание, выплата и запись тира не идут параллельно. */
export async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T | { locked: true }> {
  if (locks.has(userId)) return { locked: true };
  const redis = getRedis();
  let held = false;
  if (redis) {
    const got = await redis.set(`slots:lock:${userId}`, '1', { nx: true, ex: 20 });
    if (!got) return { locked: true };
    held = true;
  }
  locks.add(userId);
  try {
    return await fn();
  } finally {
    locks.delete(userId);
    if (held && redis) await redis.del(`slots:lock:${userId}`);
  }
}

/** Тир дописывает итоговую выплату, пока раунд ещё не закрыт. */
export async function setOpenPayout(userId: string, spinId: string, payout: number, capped: boolean): Promise<boolean> {
  const open = await loadOpen(userId);
  if (!open || open.spinId !== spinId || open.settled || open.baseBet <= 0) return false;
  open.payout = payout;
  open.capped = open.capped || capped;
  open.book.payoutMultiplier = Math.round((payout / open.baseBet) * 100);
  const finalWin = [...open.book.events].reverse().find((event) => event.type === 'finalWin');
  if (finalWin) finalWin.amount = open.book.payoutMultiplier;
  const pickResult = open.book.events.find((event) => event.type === 'pickResult');
  if (pickResult) pickResult.amount = open.book.payoutMultiplier;
  else open.book.events.push({ index: open.book.events.length, type: 'pickResult', amount: open.book.payoutMultiplier });
  await saveOpen(userId, open);
  return true;
}

/** Зачислить открытый раунд. Повторный вызов возвращает уже записанный баланс. */
export async function settleOpen(userId: string, spinId?: string): Promise<
  | { ok: true; balance: number; payout: number; already: boolean }
  | { ok: false; error: string; status: number }
> {
  const open = await loadOpen(userId);
  if (!open || (spinId && open.spinId !== spinId)) {
    if (spinId) {
      const replay = await loadReplay(userId, spinId);
      if (replay?.settled && replay.balance != null) {
        return { ok: true, balance: replay.balance, payout: replay.payout, already: true };
      }
    }
    return { ok: false, error: 'Нет открытого раунда', status: 404 };
  }
  if (open.settled && open.balance != null) {
    await clearOpen(userId);
    return { ok: true, balance: open.balance, payout: open.payout, already: true };
  }
  const paid = await changeBalance(userId, open.mode, open.payout);
  if (!paid.ok) return paid;
  open.settled = true;
  open.balance = paid.balance;
  await saveOpen(userId, open);
  await clearOpen(userId);
  return { ok: true, balance: paid.balance, payout: open.payout, already: false };
}
