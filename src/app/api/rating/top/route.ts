import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveAuthMethod } from '@/lib/user/resolve-auth-method';
import { normalizeUserStats } from '@/lib/user/normalize-user-stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/rating/top — Публичный рейтинг игроков (не требует админ-права)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const { data: users, error } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, username, first_name, rating, games_played, total_games, total_games_played, games_won, wins, avatar_url, auth_method, telegram_id, vk_id')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Ошибка загрузки рейтинга:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const players = (users || []).map((u: Record<string, unknown>) => {
      const stats = normalizeUserStats(u);
      return {
        id: u.id,
        username: u.username || u.first_name || 'Игрок',
        rating: u.rating || 0,
        games_played: stats.gamesPlayed,
        games_won: stats.wins,
        avatar_url: u.avatar_url || null,
        auth_method: resolveAuthMethod(u),
      };
    });

    return NextResponse.json({ success: true, players });
  } catch (e: unknown) {
    console.error('❌ Ошибка рейтинга:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
