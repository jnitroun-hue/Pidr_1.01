import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getSupabaseAdmin } from '@/lib/supabase';
import { resolveMasterAddress, tonAddressForTransfer } from '@/lib/wallets/master-addresses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function authenticatedUser(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) return null;
  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  return dbUserId ? String(dbUserId) : null;
}

export async function GET(req: NextRequest) {
  const userId = await authenticatedUser(req);
  if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const { data, error } = await getSupabaseAdmin()
    .from('_pidr_deposit_intents')
    .select('id, memo, destination, expected_amount_nano, status, tx_hash, coins_credited, expires_at, created_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'submitted', 'ambiguous'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return json({ success: false, message: 'Не удалось загрузить платёж' }, { status: 500 });
  return json({ success: true, intent: data });
}

export async function POST(req: NextRequest) {
  const userId = await authenticatedUser(req);
  if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { coin?: string; amount?: number } | null;
  const coin = body?.coin?.toUpperCase() === 'GRAM' ? 'GRAM' : 'TON';
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < 0.1 || amount > 100_000) {
    return json({ success: false, message: 'Сумма TON должна быть от 0.1 до 100 000' }, { status: 400 });
  }

  const master = resolveMasterAddress(coin);
  if (!master) {
    return json({ success: false, message: 'MASTER_TON_ADDRESS не настроен' }, { status: 503 });
  }

  const id = randomUUID();
  const memo = `deposit_${id.replaceAll('-', '')}`;
  const expectedNano = BigInt(Math.round(amount * 1_000_000_000));
  const destination = tonAddressForTransfer(master.address);
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('_pidr_deposit_intents')
    .insert({
      id,
      user_id: userId,
      coin,
      destination,
      expected_amount_nano: expectedNano.toString(),
      memo,
      status: 'pending',
    })
    .select('id, memo, destination, expected_amount_nano, status, expires_at')
    .single();

  if (error) {
    console.error('[deposit-intents] create failed:', error);
    return json(
      { success: false, code: 'MIGRATION_REQUIRED', message: 'Хранилище платежей не готово' },
      { status: 503 }
    );
  }

  return json({
    success: true,
    intent: {
      id: data.id,
      memo: data.memo,
      destination: data.destination,
      amountNano: String(data.expected_amount_nano),
      status: data.status,
      expiresAt: data.expires_at,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await authenticatedUser(req);
  if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: 'submitted' | 'ambiguous' | 'cancelled';
    clientResult?: string;
  } | null;
  if (!body?.id || !['submitted', 'ambiguous', 'cancelled'].includes(body.status || '')) {
    return json({ success: false, message: 'Некорректный статус платежа' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('_pidr_deposit_intents')
    .update({
      status: body.status,
      client_result: body.clientResult?.slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .eq('user_id', userId)
    .in('status', ['pending', 'submitted', 'ambiguous'])
    .select('id, status')
    .maybeSingle();

  if (error) return json({ success: false, message: 'Не удалось обновить платёж' }, { status: 500 });
  return json({ success: true, intent: data });
}
