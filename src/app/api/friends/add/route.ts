import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { resolveFriendUser, sendFriendRequest } from '@/lib/friends/friend-links';

/**
 * POST /api/friends/add
 * friend_id — id пользователя из БД (или legacy telegram_id)
 * Отправляет запрос в друзья; взаимная дружба только после принятия.
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

    const result = await sendFriendRequest(supabase, dbUserId, friendUser.id);

    if (result === 'already_friends') {
      return NextResponse.json(
        { success: false, error: 'Уже в друзьях' },
        { status: 400 }
      );
    }

    if (result === 'already_sent') {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Запрос уже отправлен — ждём ответа',
      });
    }

    if (result === 'accepted') {
      return NextResponse.json({
        success: true,
        status: 'accepted',
        message: 'Запрос принят — вы теперь друзья!',
      });
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Приглашение в друзья отправлено',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/add:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
