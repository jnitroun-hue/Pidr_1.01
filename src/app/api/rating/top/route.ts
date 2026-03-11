import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
      .select('id, username, first_name, rating, games_played, games_won, avatar_url')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Ошибка загрузки рейтинга:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const players = (users || []).map((u: any) => ({
      id: u.id,
      username: u.username || u.first_name || 'Игрок',
      rating: u.rating || 0,
      games_played: u.games_played || 0,
      games_won: u.games_won || 0,
      avatar_url: u.avatar_url || null,
    }));

    return NextResponse.json({ success: true, players });
  } catch (e: any) {
    console.error('❌ Ошибка рейтинга:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

