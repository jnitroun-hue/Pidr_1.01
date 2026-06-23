export type MatchType = 'normal' | 'rated';

export const MIN_ROOM_PLAYERS = 4;
export const MAX_ROOM_PLAYERS = 9;

export function clampRoomSize(n: unknown): number {
  const parsed = Number(n);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(MAX_ROOM_PLAYERS, Math.max(MIN_ROOM_PLAYERS, Math.round(parsed)));
}

export function normalizeMatchType(raw: unknown): MatchType {
  const value = String(raw || '').toLowerCase();
  if (value === 'rated' || value === 'ranked' || value === 'rating' || value === 'competitive') {
    return 'rated';
  }
  return 'normal';
}

export function matchTypeLabel(type: MatchType): string {
  return type === 'rated' ? 'Рейтинговый' : 'Обычный';
}

export function canStartRoom(playerCount: number, maxPlayers: number): boolean {
  return playerCount > 0 && playerCount === clampRoomSize(maxPlayers);
}

export function isPublicRoomListing(room: { is_private?: boolean | null }): boolean {
  return !room.is_private;
}
