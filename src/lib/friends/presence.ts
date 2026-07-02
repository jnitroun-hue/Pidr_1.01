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
