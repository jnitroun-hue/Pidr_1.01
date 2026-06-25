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
