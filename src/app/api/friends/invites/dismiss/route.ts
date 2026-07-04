import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

/** POST /api/friends/invites/dismiss — скрыть приглашение в комнату */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(
      auth.userId,
      auth.environment
    );

    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const inviteId = Number(body.invite_id);
    if (!Number.isFinite(inviteId) || inviteId <= 0) {
      return NextResponse.json({ success: false, error: 'invite_id обязателен' }, { status: 400 });
    }

    const recipientKeys = [dbUserId];
    if (dbUser?.telegram_id) {
      const tg = parseInt(String(dbUser.telegram_id), 10);
      if (!Number.isNaN(tg)) recipientKeys.push(tg);
    }

    const { error } = await supabase
      .from('_pidr_room_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId)
      .in('to_user_id', recipientKeys)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
