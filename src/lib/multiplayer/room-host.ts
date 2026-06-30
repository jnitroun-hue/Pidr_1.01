import type { SupabaseClient } from '@supabase/supabase-js';

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
