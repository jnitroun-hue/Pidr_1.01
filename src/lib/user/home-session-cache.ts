export const HOME_SESSION_KEY = 'pidr_home_session';

export interface HomeCachedUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  telegramId?: string;
  coins: number;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  photoUrl?: string;
}

export function readCachedHomeUser(): HomeCachedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HOME_SESSION_KEY);
    return raw ? (JSON.parse(raw) as HomeCachedUser) : null;
  } catch {
    return null;
  }
}

export function cacheHomeUser(user: HomeCachedUser): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(HOME_SESSION_KEY, JSON.stringify(user));
  } catch {
    /* ignore quota / private mode */
  }
}

export function patchHomeSessionPhoto(photoUrl: string): void {
  const cached = readCachedHomeUser();
  if (!cached) return;
  cacheHomeUser({ ...cached, photoUrl });
}

export function clearHomeSessionCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(HOME_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
