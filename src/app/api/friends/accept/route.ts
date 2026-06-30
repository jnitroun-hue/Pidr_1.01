import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { friendLinkId, friendLinkIdsForUser } from '@/lib/friends/friend-links';

/**
 * POST /api/friends/accept
 * friend_id — id из БД отправителя запроса
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
    const myCanonical = friendLinkId(dbUserId);
    const fromKey = friendLinkId(friendIdRaw);

    const { data: pendingRequest, error: checkError } = await supabase
      .from('_pidr_friends')
      .select('id, status, user_id, friend_id')
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

    const { error: updateError } = await supabase
      .from('_pidr_friends')
      .update({ status: 'accepted' })
      .eq('id', pendingRequest.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Ошибка принятия запроса' },
        { status: 500 }
      );
    }

    const { data: existingReverse } = await supabase
      .from('_pidr_friends')
      .select('id')
      .eq('user_id', myCanonical)
      .eq('friend_id', fromKey)
      .maybeSingle();

    if (!existingReverse) {
      await supabase.from('_pidr_friends').insert({
        user_id: myCanonical,
        friend_id: fromKey,
        status: 'accepted',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: 'Запрос принят!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/accept:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
