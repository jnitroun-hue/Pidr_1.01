/** Пульс «я в игре» — каждую 1 с */
export const GAME_HEARTBEAT_INTERVAL_MS = 1_000;

/** Локальная проверка «пропал ли игрок» */
export const PRESENCE_STALE_CHECK_MS = 350;

/** Нет пульса ~8 с → offline (веб-клиент грузится дольше мини-аппа) */
export const MULTIPLAYER_PRESENCE_TIMEOUT_MS = 8_000;

/** Резервный опрос API (если Realtime мигнул) */
export const PRESENCE_API_POLL_MS = 1_500;

export function parseActivityMs(value: unknown): number | null {
  if (value == null || value === '') return null;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isRoomPlayerConnected(player: {
  is_bot?: boolean;
  is_online?: boolean | null;
  last_activity?: string | null;
}): boolean {
  if (player.is_bot === true) return true;
  if (player.is_online === false) return false;

  const lastMs = parseActivityMs(player.last_activity);
  if (lastMs == null) {
    return true;
  }

  return Date.now() - lastMs < MULTIPLAYER_PRESENCE_TIMEOUT_MS;
}
