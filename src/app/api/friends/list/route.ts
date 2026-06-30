import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import {
  friendLinkIdsForUser,
  formatFriendForApi,
  resolveUsersByFriendKeys,
} from '@/lib/friends/friend-links';

/**
 * GET /api/friends/list
 * Список друзей по id из БД (+ рефералы, legacy telegram_id)
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

    const ownerLinkIds = friendLinkIdsForUser(dbUserId, dbUser.telegram_id);
    console.log(`👥 [FRIENDS LIST] dbUserId=${dbUserId}, linkIds=`, ownerLinkIds);

    const { data: friendships, error } = await supabase
      .from('_pidr_friends')
      .select('friend_id, created_at')
      .in('user_id', ownerLinkIds)
      .eq('status', 'accepted');

    if (error) {
      console.error('❌ [FRIENDS LIST] Ошибка:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const friendKeys = new Set<string>(
      (friendships || []).map((f: { friend_id: string }) => String(f.friend_id))
    );

    // Рефералы — показываем как друзей (пригласивший ↔ приглашённый)
    const { data: referralRows } = await supabase
      .from('_pidr_referrals')
      .select('referrer_user_id, referred_user_id')
      .or(`referrer_user_id.eq.${dbUserId},referred_user_id.eq.${dbUserId}`);

    for (const row of referralRows || []) {
      const otherId =
        row.referrer_user_id === dbUserId ? row.referred_user_id : row.referrer_user_id;
      if (otherId) friendKeys.add(String(otherId));
    }

    friendKeys.delete(String(dbUserId));
    if (dbUser.telegram_id) friendKeys.delete(String(dbUser.telegram_id));

    if (friendKeys.size === 0) {
      return NextResponse.json({ success: true, friends: [] });
    }

    const users = await resolveUsersByFriendKeys(supabase, [...friendKeys]);
    const formattedFriends = users.map(formatFriendForApi);

    console.log(`✅ [FRIENDS LIST] ${formattedFriends.length} друзей для user ${dbUserId}`);

    return NextResponse.json({ success: true, friends: formattedFriends });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/list:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
