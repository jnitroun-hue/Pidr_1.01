import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/user/public?userId=4 — публичный профиль для модалки в игре */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const telegramIdParam = searchParams.get('telegramId');

    if (!userIdParam && !telegramIdParam) {
      return NextResponse.json(
        { success: false, error: 'userId or telegramId required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('_pidr_users')
      .select(
        'id, username, first_name, avatar_url, rating, games_played, wins, losses, telegram_id, is_bot'
      );

    if (userIdParam) {
      const id = parseInt(userIdParam, 10);
      if (Number.isNaN(id)) {
        return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 });
      }
      query = query.eq('id', id);
    } else {
      query = query.eq('telegram_id', String(telegramIdParam));
    }

    const { data: user, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const gamesPlayed = Number(user.games_played) || 0;
    const wins = Number(user.wins) || 0;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username || user.first_name || `player_${user.id}`,
        avatar_url: user.avatar_url,
        rating: user.rating ?? 1000,
        gamesPlayed,
        wins,
        losses: user.losses ?? 0,
        winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
        telegram_id: user.telegram_id,
        is_bot: user.is_bot === true,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
