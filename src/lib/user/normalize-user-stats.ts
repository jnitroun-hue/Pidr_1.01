export interface UserStatsRow {
  games_played?: number | null;
  total_games?: number | null;
  total_games_played?: number | null;
  games_won?: number | null;
  wins?: number | null;
  losses?: number | null;
}

export interface NormalizedUserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}

/** Единый источник правды: берём максимум из дублирующих колонок БД */
export function normalizeUserStats(user: UserStatsRow): NormalizedUserStats {
  const gamesPlayed = Math.max(
    Number(user.total_games_played) || 0,
    Number(user.total_games) || 0,
    Number(user.games_played) || 0
  );
  const wins = Math.max(Number(user.games_won) || 0, Number(user.wins) || 0);
  const losses =
    user.losses != null && user.losses >= 0
      ? Number(user.losses)
      : Math.max(0, gamesPlayed - wins);
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  return { gamesPlayed, wins, losses, winRate };
}

/** Синхронные значения для записи в БД после +1 игры */
export function nextGamesPlayedColumns(user: UserStatsRow): {
  games_played: number;
  total_games: number;
  total_games_played: number;
} {
  const next = normalizeUserStats(user).gamesPlayed + 1;
  return {
    games_played: next,
    total_games: next,
    total_games_played: next,
  };
}

/** Синхронные значения побед для всех дублирующих колонок */
export function nextWinsColumns(user: UserStatsRow): {
  games_won: number;
  wins: number;
} {
  const next = normalizeUserStats(user).wins + 1;
  return {
    games_won: next,
    wins: next,
  };
}
