import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { formatFriendForApi } from '@/lib/friends/friend-links';
import { matchLabelFromRoom } from '@/lib/multiplayer/room-rules';

/** GET /api/friends/invites — приглашения в комнаты для текущего пользователя */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500 }
      );
    }

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: true, authenticated: false, invites: [] });
    }

    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(
      auth.userId,
      auth.environment
    );

    if (!dbUserId) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const recipientKeys = [dbUserId];
    if (dbUser?.telegram_id) {
      const tg = parseInt(String(dbUser.telegram_id), 10);
      if (!Number.isNaN(tg)) recipientKeys.push(tg);
    }

    const nowIso = new Date().toISOString();

    const { data: invites, error } = await supabase
      .from('_pidr_room_invites')
      .select('id, room_id, room_code, from_user_id, created_at, expires_at, status')
      .in('to_user_id', recipientKeys)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Ошибка получения приглашений' },
        { status: 500 }
      );
    }

    const detailed = await Promise.all(
      (invites || []).map(async (invite: {
        id: number;
        room_id: number;
        room_code: string;
        from_user_id: number;
        created_at: string;
        expires_at: string;
        status: string;
      }) => {
        const [roomRes, fromUser] = await Promise.all([
          supabase
            .from('_pidr_rooms')
            .select('id, room_code, name, status, max_players, current_players, match_type, settings')
            .eq('id', invite.room_id)
            .single(),
          supabase
            .from('_pidr_users')
            .select(
              'id, telegram_id, username, first_name, avatar_url, status, online_status'
            )
            .or(`id.eq.${invite.from_user_id},telegram_id.eq.${invite.from_user_id}`)
            .maybeSingle(),
        ]);

        const room = roomRes.data;
        return {
          id: invite.id,
          room: room
            ? {
                id: room.id,
                room_code: room.room_code,
                name: room.name,
                status: room.status,
                max_players: room.max_players,
                current_players: room.current_players,
                match_label: matchLabelFromRoom(room),
              }
            : null,
          from: fromUser.data ? formatFriendForApi(fromUser.data) : null,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
        };
      })
    );

    return NextResponse.json({ success: true, invites: detailed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ [FRIENDS INVITES] Ошибка API:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
