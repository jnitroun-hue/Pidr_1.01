import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/rating-prizes — pending TON prizes from weekly rating */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.isAdmin) {
    return NextResponse.json({ success: false, error: admin.error || 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  let query = supabaseAdmin
    .from('_pidr_crypto_transactions')
    .select('id, user_id, amount, wallet_address, purpose, status, transaction_hash, created_at')
    .like('purpose', 'weekly_rating_prize:%')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status === 'pending') {
    query = query.in('status', ['pending_payout', 'awaiting_wallet']);
  } else if (status === 'paid') {
    query = query.eq('status', 'paid');
  }

  const { data: prizes, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((prizes || []).map((p: { user_id: number }) => p.user_id))];
  let usersMap: Record<number, { username?: string; telegram_id?: string }> = {};

  if (userIds.length) {
    const { data: users } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, username, first_name, telegram_id')
      .in('id', userIds);

    usersMap = Object.fromEntries(
      (users || []).map((u: { id: number; username?: string; first_name?: string; telegram_id?: string }) => [
        u.id,
        { username: u.username || u.first_name || `ID ${u.id}`, telegram_id: u.telegram_id },
      ])
    );
  }

  const enriched = (prizes || []).map((p: {
    id: number;
    user_id: number;
    amount: number;
    wallet_address: string;
    purpose: string;
    status: string;
    transaction_hash: string;
    created_at: string;
  }) => {
    const placeMatch = p.purpose?.match(/place:(\d+)/);
    const weekMatch = p.purpose?.match(/weekly_rating_prize:([^:]+)/);
    return {
      ...p,
      place: placeMatch ? Number(placeMatch[1]) : null,
      weekKey: weekMatch?.[1] ?? null,
      username: usersMap[p.user_id]?.username ?? `User #${p.user_id}`,
      telegram_id: usersMap[p.user_id]?.telegram_id ?? null,
    };
  });

  return NextResponse.json({ success: true, prizes: enriched });
}

/** PATCH /api/admin/rating-prizes — mark TON prize as paid manually */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.isAdmin) {
    return NextResponse.json({ success: false, error: admin.error || 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, payoutTxHash, note } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('_pidr_crypto_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ success: false, error: 'Prize not found' }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('_pidr_crypto_transactions')
    .update({
      status: 'paid',
      transaction_hash: payoutTxHash || existing.transaction_hash,
      purpose: `${existing.purpose}|paid_at:${new Date().toISOString()}${note ? `|note:${note}` : ''}`,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Приз отмечен как выплаченный' });
}
