import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import {
  friendLinkIdsForUser,
  formatFriendForApi,
  resolveUsersByFriendKeys,
} from '@/lib/friends/friend-links';

/**
 * GET /api/friends/requests
 * Входящие и исходящие запросы в друзья (status = pending)
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

    const myKeys = friendLinkIdsForUser(dbUserId, dbUser.telegram_id);

    const [{ data: incomingRows, error: inErr }, { data: outgoingRows, error: outErr }] =
      await Promise.all([
        supabase
          .from('_pidr_friends')
          .select('id, user_id, created_at')
          .in('friend_id', myKeys)
          .eq('status', 'pending'),
        supabase
          .from('_pidr_friends')
          .select('id, friend_id, created_at')
          .in('user_id', myKeys)
          .eq('status', 'pending'),
      ]);

    if (inErr || outErr) {
      return NextResponse.json(
        { success: false, error: inErr?.message || outErr?.message || 'Query error' },
        { status: 500 }
      );
    }

    const incomingKeys = (incomingRows || []).map((r: { user_id: string }) => String(r.user_id));
    const outgoingKeys = (outgoingRows || []).map((r: { friend_id: string }) => String(r.friend_id));

    const [incomingUsers, outgoingUsers] = await Promise.all([
      resolveUsersByFriendKeys(supabase, incomingKeys),
      resolveUsersByFriendKeys(supabase, outgoingKeys),
    ]);

    const incomingByKey = new Map(incomingUsers.map((u) => [String(u.id), u]));
    if (dbUser.telegram_id) {
      for (const u of incomingUsers) {
        if (u.telegram_id) incomingByKey.set(String(u.telegram_id), u);
      }
    }

    const outgoingByKey = new Map(outgoingUsers.map((u) => [String(u.id), u]));
    if (dbUser.telegram_id) {
      for (const u of outgoingUsers) {
        if (u.telegram_id) outgoingByKey.set(String(u.telegram_id), u);
      }
    }

    const incoming = (incomingRows || [])
      .map((row: { id: number; user_id: string; created_at: string }) => {
        const u = incomingByKey.get(String(row.user_id));
        if (!u) return null;
        return {
          request_id: row.id,
          created_at: row.created_at,
          ...formatFriendForApi(u),
        };
      })
      .filter(Boolean);

    const outgoing = (outgoingRows || [])
      .map((row: { id: number; friend_id: string; created_at: string }) => {
        const u = outgoingByKey.get(String(row.friend_id));
        if (!u) return null;
        return {
          request_id: row.id,
          created_at: row.created_at,
          ...formatFriendForApi(u),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, incoming, outgoing });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ошибка API /api/friends/requests:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
