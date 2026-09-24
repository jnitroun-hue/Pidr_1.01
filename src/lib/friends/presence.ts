export type FriendPresenceStatus = 'online' | 'offline' | 'in_room' | 'playing';

const ONLINE_TTL_MS = 5 * 60 * 1000;

export function resolveFriendPresence(user: {
  status?: string | null;
  online_status?: string | null;
  last_seen?: string | null;
}): { status: FriendPresenceStatus; label: string; isOnline: boolean } {
  const raw = String(user.online_status || user.status || 'offline').toLowerCase();

  if (user.last_seen) {
    const age = Date.now() - new Date(user.last_seen).getTime();
    if (age > ONLINE_TTL_MS) {
      return { status: 'offline', label: 'Не в сети', isOnline: false };
    }
  }

  if (raw === 'playing') {
    return { status: 'playing', label: 'В игре', isOnline: true };
  }
  if (raw === 'in_room') {
    return { status: 'in_room', label: 'В комнате', isOnline: true };
  }
  if (raw === 'online') {
    return { status: 'online', label: 'В сети', isOnline: true };
  }

  return { status: 'offline', label: 'Не в сети', isOnline: false };
}

/** Коротко: «только что», «12 мин назад», «вчера». */
export function formatLastSeen(iso?: string | null): string {
  if (!iso) return 'давно не заходил';
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return 'давно не заходил';
  const diff = Date.now() - time;
  if (diff < 5 * 60 * 1000) return 'только что';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 14) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}
