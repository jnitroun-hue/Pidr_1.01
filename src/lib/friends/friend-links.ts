import type { SupabaseClient } from '@supabase/supabase-js';

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
  username?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  rating?: number | null;
  games_played?: number | null;
  wins?: number | null;
  status?: string | null;
  online_status?: string | null;
  last_seen?: string | null;
};

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
        await supabase
          .from('_pidr_users')
          .select(
            'id, telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, online_status, last_seen'
          )
          .in('id', numericIds)
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
      .select(
        'id, telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, online_status, last_seen'
      )
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
      .select(
        'id, telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, online_status, last_seen'
      )
      .eq('id', asNum)
      .maybeSingle();
    if (data) return data as FriendUserRow;
  }

  const { data: byTelegram } = await supabase
    .from('_pidr_users')
    .select(
      'id, telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, online_status, last_seen'
    )
    .eq('telegram_id', key)
    .maybeSingle();

  return (byTelegram as FriendUserRow) || null;
}

export function formatFriendForApi(u: FriendUserRow) {
  return {
    id: u.id,
    telegram_id: u.telegram_id ? Number(u.telegram_id) || u.telegram_id : null,
    username: u.username || u.first_name || `player_${u.id}`,
    first_name: u.first_name || u.username || `Игрок ${u.id}`,
    avatar_url: u.avatar_url,
    rating: u.rating ?? 0,
    games_played: u.games_played ?? 0,
    wins: u.wins ?? 0,
    status: u.online_status || u.status || 'offline',
    last_seen: u.last_seen,
  };
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
