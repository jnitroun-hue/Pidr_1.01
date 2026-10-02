import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, error: 'Нужно войти в аккаунт' }, { status: 401 });
  }
  const { dbUserId, user } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId || !user) {
    return NextResponse.json({ success: false, error: 'Игрок не найден' }, { status: 404 });
  }
  const { data, error } = await supabaseAdmin
    .from('_pidr_slot_balances')
    .select('gram_units')
    .eq('user_id', dbUserId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    coins: Number(user.coins || 0),
    gramUnits: error ? null : Number(data?.gram_units || 0),
    gramReady: !error,
  });
}
