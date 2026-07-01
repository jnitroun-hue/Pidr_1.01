/** Порог: 2 пропущенных игровых heartbeat (~5 с) + запас */
export const MULTIPLAYER_PRESENCE_TIMEOUT_MS = 22_000;

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
