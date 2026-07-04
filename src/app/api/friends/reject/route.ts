import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { friendLinkId, friendLinkIdsForUser } from '@/lib/friends/friend-links';

/**
 * POST /api/friends/reject
 * Отклонить входящий запрос в друзья
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

    if (friendIdRaw == null) {
      return NextResponse.json({ success: false, error: 'friend_id обязателен' }, { status: 400 });
    }

    const myKeys = friendLinkIdsForUser(dbUserId, dbUser.telegram_id);
    const fromKey = friendLinkId(friendIdRaw);

    const { data: pendingRequest, error: checkError } = await supabase
      .from('_pidr_friends')
      .select('id')
      .eq('user_id', fromKey)
      .in('friend_id', myKeys)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError || !pendingRequest) {
      return NextResponse.json(
        { success: false, error: 'Запрос в друзья не найден' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('_pidr_friends')
      .delete()
      .eq('id', pendingRequest.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Не удалось отклонить запрос' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Запрос отклонён' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/reject:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
