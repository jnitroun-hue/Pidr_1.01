import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { friendLinkId, resolveFriendUser } from '@/lib/friends/friend-links';

/**
 * POST /api/friends/add
 * friend_id — id пользователя из БД (или legacy telegram_id)
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

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Уже в друзьях (статус: ${existing.status})` },
        { status: 400 }
      );
    }

    const { error: error1 } = await supabase.from('_pidr_friends').insert({
      user_id: ownerKey,
      friend_id: friendKey,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error1) {
      console.error('❌ [FRIENDS ADD]:', error1);
      return NextResponse.json(
        { success: false, error: `Ошибка создания запроса: ${error1.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Запрос в друзья отправлен!' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/add:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
