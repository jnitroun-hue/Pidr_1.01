import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { formatFriendForApi } from '@/lib/friends/friend-links';

/**
 * GET /api/friends/search?query=username
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    const auth = requireAuth(request);
    let currentDbUserId: number | null = null;

    if (auth.userId && !auth.error) {
      const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
      currentDbUserId = dbUserId;
    }

    let usersQuery = supabase
      .from('_pidr_users')
      .select(
        'id, telegram_id, username, first_name, avatar_url, rating, games_played, wins, status, online_status, last_seen'
      )
      .ilike('username', `%${query}%`)
      .limit(20);

    if (currentDbUserId != null) {
      usersQuery = usersQuery.neq('id', currentDbUserId);
    }

    const { data: users, error } = await usersQuery;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      users: (users || []).map(formatFriendForApi),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/search:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
