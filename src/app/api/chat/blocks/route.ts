import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BlockRow = {
  blocked_user_id: number | null;
  blocked_player_key: string | null;
};

/** GET /api/chat/blocks — список заблокированных для текущего пользователя */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('_pidr_chat_blocks')
      .select('blocked_user_id, blocked_player_key')
      .eq('blocker_user_id', dbUserId);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          blockedUserIds: [],
          blockedPlayerKeys: [],
          warning: 'chat_blocks table missing — run migration 0015',
        });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows = (data as BlockRow[]) || [];
    return NextResponse.json({
      success: true,
      blockedUserIds: rows
        .map((r) => r.blocked_user_id)
        .filter((id): id is number => id != null),
      blockedPlayerKeys: rows
        .map((r) => r.blocked_player_key)
        .filter((k): k is string => !!k && k.trim() !== ''),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST /api/chat/blocks — block | unblock */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action === 'unblock' ? 'unblock' : 'block';
    const blockedUserId =
      body.blockedUserId != null ? parseInt(String(body.blockedUserId), 10) : null;
    const blockedPlayerKey =
      typeof body.blockedPlayerKey === 'string' ? body.blockedPlayerKey.trim() : '';

    if (
      (blockedUserId == null || Number.isNaN(blockedUserId)) &&
      !blockedPlayerKey
    ) {
      return NextResponse.json(
        { success: false, error: 'blockedUserId or blockedPlayerKey required' },
        { status: 400 }
      );
    }

    if (blockedUserId === dbUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    if (action === 'unblock') {
      let query = supabaseAdmin
        .from('_pidr_chat_blocks')
        .delete()
        .eq('blocker_user_id', dbUserId);

      if (blockedUserId != null && !Number.isNaN(blockedUserId)) {
        query = query.eq('blocked_user_id', blockedUserId);
      } else {
        query = query.eq('blocked_player_key', blockedPlayerKey);
      }

      const { error } = await query;
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, blocked: false });
    }

    const { error: insertError } = await supabaseAdmin.from('_pidr_chat_blocks').insert({
      blocker_user_id: dbUserId,
      blocked_user_id: blockedUserId != null && !Number.isNaN(blockedUserId) ? blockedUserId : null,
      blocked_player_key: blockedPlayerKey || null,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, blocked: true, alreadyBlocked: true });
      }
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, blocked: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
