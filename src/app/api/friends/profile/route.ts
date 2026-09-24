import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { normalizeUserStats } from '@/lib/user/normalize-user-stats';
import { resolveFriendPresence, formatLastSeen } from '@/lib/friends/presence';

export const dynamic = 'force-dynamic';

/** GET /api/friends/profile?id= — публичный игровой профиль друга */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection error' }, { status: 500 });
    }

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const id = Number(request.nextUrl.searchParams.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('id, username, first_name, avatar_url, rating, games_played, total_games_played, wins, games_won, losses, first_places, second_places, third_places, best_win_streak, is_premium, status, online_status, last_seen')
      .eq('id', id)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Игрок не найден' },
        { status: error ? 500 : 404 }
      );
    }

    const stats = normalizeUserStats(user);
    const presence = resolveFriendPresence(user);

    const { count: nftCount } = await supabase
      .from('_pidr_nft_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id);

    const { count: achievementCount } = await supabase
      .from('_pidr_user_achievements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', String(id));

    const isPremium = Boolean(user.is_premium);

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username || '',
        first_name: user.first_name || user.username || 'Игрок',
        avatar_url: user.avatar_url || '',
        rating: Number(user.rating) || 0,
        games_played: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        win_rate: stats.winRate,
        first_places: Number(user.first_places) || 0,
        second_places: Number(user.second_places) || 0,
        third_places: Number(user.third_places) || 0,
        best_streak: Number(user.best_win_streak) || 0,
        nft_count: nftCount || 0,
        achievement_count: achievementCount || 0,
        is_premium: isPremium,
        is_online: presence.isOnline,
        status_label: presence.label,
        last_seen_label: presence.isOnline ? presence.label : formatLastSeen(user.last_seen),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
