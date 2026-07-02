import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { friendLinkId, resolveFriendUser, ensureMutualFriendship } from '@/lib/friends/friend-links';

/**
 * POST /api/friends/add
 * friend_id — id пользователя из БД (или legacy telegram_id)
 * Сразу взаимная дружба (как при реферале).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(
      auth.userId,
      auth.environment
    );

    if (!dbUserId || !dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { friend_id: friendIdRaw } = body;

    if (friendIdRaw == null || friendIdRaw === '') {
      return NextResponse.json({ success: false, error: 'Invalid friend_id' }, { status: 400 });
    }

    const friendUser = await resolveFriendUser(supabase, friendIdRaw);
    if (!friendUser) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    if (friendUser.id === dbUserId) {
      return NextResponse.json(
        { success: false, error: 'Нельзя добавить себя' },
        { status: 400 }
      );
    }

    const ownerKey = friendLinkId(dbUserId);
    const friendKey = friendLinkId(friendUser.id);

    const { data: existing } = await supabase
      .from('_pidr_friends')
      .select('id, status')
      .eq('user_id', ownerKey)
      .eq('friend_id', friendKey)
      .maybeSingle();

    if (existing?.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Уже в друзьях' },
        { status: 400 }
      );
    }

    await ensureMutualFriendship(supabase, dbUserId, friendUser.id);

    return NextResponse.json({ success: true, message: 'Друг добавлен!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/add:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
