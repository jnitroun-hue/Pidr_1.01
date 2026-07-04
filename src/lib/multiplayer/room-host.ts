import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveFriendPresence } from '@/lib/friends/presence';

/** Сравнение id из БД / Telegram / VK без ошибок string vs number. */
export function idsEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const left = String(a).trim();
  const right = String(b).trim();
  if (!left || !right) return false;
  return left === right;
}

export type RoomHostIdentity = {
  dbUserId: number;
  telegramId?: string | number | null;
  vkId?: string | number | null;
};

/**
 * Проверяет, является ли пользователь хостом комнаты.
 * Учитывает VARCHAR host_id, legacy host_id=telegram_id и флаг is_host в room_players.
 */
export async function isRoomHostUser(
  supabase: SupabaseClient,
  roomId: number | string,
  identity: RoomHostIdentity
): Promise<boolean> {
  const { dbUserId, telegramId, vkId } = identity;
  const numericRoomId = typeof roomId === 'string' ? parseInt(roomId, 10) : roomId;
  if (Number.isNaN(numericRoomId)) return false;

  const { data: room, error: roomError } = await supabase
    .from('_pidr_rooms')
    .select('host_id')
    .eq('id', numericRoomId)
    .maybeSingle();

  if (roomError || !room) {
    return false;
  }

  const hostId = room.host_id;

  if (idsEqual(hostId, dbUserId)) return true;
  if (telegramId != null && idsEqual(hostId, telegramId)) return true;
  if (vkId != null && idsEqual(hostId, vkId)) return true;

  const { data: players } = await supabase
    .from('_pidr_room_players')
    .select('user_id, is_host')
    .eq('room_id', numericRoomId);

  const hostPlayer = (players || []).find((player) => {
    if (player.is_host !== true) return false;
    if (idsEqual(player.user_id, dbUserId)) return true;
    if (telegramId != null && idsEqual(player.user_id, telegramId)) return true;
    if (vkId != null && idsEqual(player.user_id, vkId)) return true;
    return false;
  });

  if (hostPlayer) {
    if (!idsEqual(hostId, dbUserId)) {
      await supabase
        .from('_pidr_rooms')
        .update({
          host_id: dbUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', numericRoomId);
    }
    return true;
  }

  return false;
}

export type RoomHostRow = {
  id: number;
  telegram_id?: string | null;
  username?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  online_status?: string | null;
};

const HOST_SELECT =
  'id, telegram_id, username, first_name, avatar_url, status, online_status';

/** host_id в _pidr_rooms — id из БД (иногда legacy telegram_id) */
export async function resolveRoomHost(
  supabase: SupabaseClient,
  roomId: number,
  hostId: string | number | null | undefined
): Promise<RoomHostRow | null> {
  if (hostId == null || hostId === '') return null;

  const key = String(hostId);
  const asNum = parseInt(key, 10);

  if (!Number.isNaN(asNum)) {
    const { data } = await supabase
      .from('_pidr_users')
      .select(HOST_SELECT)
      .eq('id', asNum)
      .maybeSingle();
    if (data) return data as RoomHostRow;
  }

  const { data: byTelegram } = await supabase
    .from('_pidr_users')
    .select(HOST_SELECT)
    .eq('telegram_id', key)
    .maybeSingle();
  if (byTelegram) return byTelegram as RoomHostRow;

  const { data: hostPlayer } = await supabase
    .from('_pidr_room_players')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('is_host', true)
    .maybeSingle();

  if (hostPlayer?.user_id) {
    const { data } = await supabase
      .from('_pidr_users')
      .select(HOST_SELECT)
      .eq('id', hostPlayer.user_id)
      .maybeSingle();
    if (data) return data as RoomHostRow;
  }

  const { data: firstPlayer } = await supabase
    .from('_pidr_room_players')
    .select('user_id')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstPlayer?.user_id) {
    const { data } = await supabase
      .from('_pidr_users')
      .select(HOST_SELECT)
      .eq('id', firstPlayer.user_id)
      .maybeSingle();
    if (data) return data as RoomHostRow;
  }

  return null;
}

export function formatRoomHostForInvite(host: RoomHostRow) {
  const presence = resolveFriendPresence(host);
  return {
    telegramId: host.telegram_id ? Number(host.telegram_id) || host.telegram_id : host.id,
    username: host.username || host.first_name || `player_${host.id}`,
    firstName: host.first_name || host.username || `Игрок ${host.id}`,
    avatarUrl: host.avatar_url,
    status: presence.status,
    isOnline: presence.isOnline,
  };
}
