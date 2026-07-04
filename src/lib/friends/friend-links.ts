import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveAuthMethod } from '@/lib/user/resolve-auth-method';
import { normalizeUserStats } from '@/lib/user/normalize-user-stats';
import { resolveFriendPresence } from '@/lib/friends/presence';

/** Ключ связи в `_pidr_friends` — всегда id пользователя из БД */
export function friendLinkId(dbUserId: number | string): string {
  return String(dbUserId);
}

/** Старые записи могли хранить telegram_id — ищем по обоим ключам */
export function friendLinkIdsForUser(
  dbUserId: number,
  telegramId?: string | number | null
): string[] {
  const ids = new Set<string>([friendLinkId(dbUserId)]);
  if (telegramId != null && String(telegramId).trim() !== '') {
    ids.add(String(telegramId));
  }
  return [...ids];
}

export type FriendUserRow = {
  id: number;
  telegram_id?: string | null;
  vk_id?: string | null;
  auth_method?: string | null;
  username?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  rating?: number | null;
  games_played?: number | null;
  total_games_played?: number | null;
  wins?: number | null;
  games_won?: number | null;
  losses?: number | null;
  status?: string | null;
  online_status?: string | null;
  last_seen?: string | null;
};

const FRIEND_USER_SELECT =
  'id, telegram_id, vk_id, auth_method, username, first_name, avatar_url, rating, games_played, total_games_played, wins, games_won, losses, status, online_status, last_seen';

/** Разрешить пользователей по ключам из `_pidr_friends` (id или legacy telegram_id) */
export async function resolveUsersByFriendKeys(
  supabase: SupabaseClient,
  keys: string[]
): Promise<FriendUserRow[]> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return [];

  const numericIds = unique
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n));

  const byId = numericIds.length
    ? (
        await supabase.from('_pidr_users').select(FRIEND_USER_SELECT).in('id', numericIds)
      ).data
    : [];

  const foundKeys = new Set<string>();
  for (const u of byId || []) {
    foundKeys.add(String(u.id));
    if (u.telegram_id) foundKeys.add(String(u.telegram_id));
  }

  const legacyTelegramKeys = unique.filter((k) => !foundKeys.has(k));
  let byTelegram: FriendUserRow[] = [];
  if (legacyTelegramKeys.length) {
    const { data } = await supabase
      .from('_pidr_users')
      .select(FRIEND_USER_SELECT)
      .in('telegram_id', legacyTelegramKeys);
    byTelegram = (data as FriendUserRow[]) || [];
  }

  const merged = new Map<number, FriendUserRow>();
  for (const u of [...(byId || []), ...byTelegram]) {
    merged.set(u.id, u);
  }
  return [...merged.values()];
}

/** Найти пользователя по id БД или legacy telegram_id */
export async function resolveFriendUser(
  supabase: SupabaseClient,
  friendKey: string | number
): Promise<FriendUserRow | null> {
  const key = String(friendKey);
  const asNum = parseInt(key, 10);

  if (!Number.isNaN(asNum)) {
    const { data } = await supabase
      .from('_pidr_users')
      .select(FRIEND_USER_SELECT)
      .eq('id', asNum)
      .maybeSingle();
    if (data) return data as FriendUserRow;
  }

  const { data: byTelegram } = await supabase
    .from('_pidr_users')
    .select(FRIEND_USER_SELECT)
    .eq('telegram_id', key)
    .maybeSingle();

  return (byTelegram as FriendUserRow) || null;
}

export function formatFriendForApi(u: FriendUserRow) {
  const stats = normalizeUserStats(u);
  const presence = resolveFriendPresence(u);
  const gamesPlayed = stats.gamesPlayed;
  const wins = stats.wins;
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  return {
    id: u.id,
    telegram_id: u.telegram_id ? Number(u.telegram_id) || u.telegram_id : null,
    username: u.username || u.first_name || `player_${u.id}`,
    first_name: u.first_name || u.username || `Игрок ${u.id}`,
    avatar_url: u.avatar_url,
    auth_method: resolveAuthMethod(u),
    rating: u.rating ?? 0,
    games_played: gamesPlayed,
    wins,
    losses: stats.losses,
    win_rate: winRate,
    status: presence.status,
    status_label: presence.label,
    is_online: presence.isOnline,
    last_seen: u.last_seen,
  };
}

/** Отправить запрос в друзья (односторонний pending) */
export async function sendFriendRequest(
  supabase: SupabaseClient,
  fromUserId: number,
  toUserId: number
): Promise<'sent' | 'accepted' | 'already_friends' | 'already_sent'> {
  if (fromUserId === toUserId) return 'already_friends';

  const fromKey = friendLinkId(fromUserId);
  const toKey = friendLinkId(toUserId);

  const { data: acceptedRows } = await supabase
    .from('_pidr_friends')
    .select('id, status, user_id, friend_id')
    .eq('status', 'accepted')
    .or(
      `and(user_id.eq.${fromKey},friend_id.eq.${toKey}),and(user_id.eq.${toKey},friend_id.eq.${fromKey})`
    )
    .limit(1);

  if (acceptedRows && acceptedRows.length > 0) {
    return 'already_friends';
  }

  const { data: incomingFromThem } = await supabase
    .from('_pidr_friends')
    .select('id')
    .eq('user_id', toKey)
    .eq('friend_id', fromKey)
    .eq('status', 'pending')
    .maybeSingle();

  if (incomingFromThem) {
    await ensureMutualFriendship(supabase, fromUserId, toUserId);
    return 'accepted';
  }

  const { data: myPending } = await supabase
    .from('_pidr_friends')
    .select('id')
    .eq('user_id', fromKey)
    .eq('friend_id', toKey)
    .eq('status', 'pending')
    .maybeSingle();

  if (myPending) {
    return 'already_sent';
  }

  await supabase.from('_pidr_friends').insert({
    user_id: fromKey,
    friend_id: toKey,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  return 'sent';
}

/** Взаимная дружба «accepted» по id из БД */
export async function ensureMutualFriendship(
  supabase: SupabaseClient,
  userIdA: number,
  userIdB: number
): Promise<void> {
  if (userIdA === userIdB) return;

  const pairs: [string, string][] = [
    [friendLinkId(userIdA), friendLinkId(userIdB)],
    [friendLinkId(userIdB), friendLinkId(userIdA)],
  ];

  for (const [user_id, friend_id] of pairs) {
    const { data: existing } = await supabase
      .from('_pidr_friends')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('friend_id', friend_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('_pidr_friends').insert({
        user_id,
        friend_id,
        status: 'accepted',
        created_at: new Date().toISOString(),
      });
    } else if (existing.status !== 'accepted') {
      await supabase.from('_pidr_friends').update({ status: 'accepted' }).eq('id', existing.id);
    }
  }
}
