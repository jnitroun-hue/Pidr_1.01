import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEPOSIT_CAPABILITIES } from '@/lib/crypto/crypto-assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRYPTO_ASSETS = new Set(['TON', 'USDT', 'BTC', 'ETH', 'TRX', 'SOL']);
const FIAT_METHODS = new Set(['bank_card', 'sberbank', 'yoo_money', 'sbp']);

function json(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function userIdFor(req: NextRequest): Promise<string | null> {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) return null;
  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  return dbUserId ? String(dbUserId) : null;
}

function validCryptoDestination(asset: string, value: string): boolean {
  if (asset === 'TON') return /^(?:EQ|UQ|0:)[A-Za-z0-9_:-]{40,}$/.test(value);
  if (asset === 'TRX' || asset === 'USDT') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
  if (asset === 'SOL') return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  if (asset === 'ETH') return /^0x[a-fA-F0-9]{40}$/.test(value);
  if (asset === 'BTC') return /^(bc1|[13])[A-Za-z0-9]{20,90}$/.test(value);
  return false;
}

export async function GET(req: NextRequest) {
  const userId = await userIdFor(req);
  if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('_pidr_withdrawal_requests')
    .select('id, amount_coins, method, asset, network, destination, status, tx_hash, rejection_reason, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);
  if (error) {
    return json({ success: false, code: 'MIGRATION_REQUIRED', message: 'История выводов пока недоступна' }, { status: 503 });
  }
  return json({ success: true, withdrawals: data || [] });
}

export async function POST(req: NextRequest) {
  const userId = await userIdFor(req);
  if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    amount?: number;
    method?: string;
    asset?: string;
    destination?: string;
  } | null;
  const amount = Math.floor(Number(body?.amount));
  const method = String(body?.method || '');
  const asset = String(body?.asset || '').toUpperCase();
  const destination = String(body?.destination || '').trim();
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 1_000_000_000) {
    return json({ success: false, message: 'Сумма вывода должна быть от 100 монет' }, { status: 400 });
  }
  if (destination.length < 5 || destination.length > 300) {
    return json({ success: false, message: 'Проверьте реквизиты получателя' }, { status: 400 });
  }

  const isCrypto = method === 'crypto';
  if (isCrypto) {
    if (!CRYPTO_ASSETS.has(asset) || !validCryptoDestination(asset, destination)) {
      return json({ success: false, message: `Адрес не похож на корректный адрес сети ${asset || 'криптовалюты'}` }, { status: 400 });
    }
  } else if (!FIAT_METHODS.has(method)) {
    return json({ success: false, message: 'Способ выплаты не поддерживается' }, { status: 400 });
  }

  const network = isCrypto
    ? DEPOSIT_CAPABILITIES[asset as keyof typeof DEPOSIT_CAPABILITIES]?.network || asset
    : 'RUB';
  const { data, error } = await getSupabaseAdmin().rpc('create_wallet_withdrawal', {
    p_user_id: userId,
    p_amount_coins: amount,
    p_method: method,
    p_asset: isCrypto ? asset : null,
    p_network: network,
    p_destination: destination,
  });
  if (error) {
    const message = /insufficient/i.test(error.message)
      ? 'Недостаточно средств'
      : /function|schema cache/i.test(error.message)
        ? 'Сначала примените миграцию wallet-withdrawals.sql'
        : 'Не удалось создать заявку';
    return json({ success: false, message }, { status: /insufficient/i.test(error.message) ? 409 : 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return json({ success: true, requestId: result?.request_id, newBalance: Number(result?.new_balance) });
}

export async function PATCH(req: NextRequest) {
  const userId = await userIdFor(req);
  if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; action?: string } | null;
  if (!body?.id || body.action !== 'cancel') {
    return json({ success: false, message: 'Некорректный запрос' }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin().rpc('cancel_wallet_withdrawal', {
    p_user_id: userId,
    p_request_id: body.id,
  });
  if (error) return json({ success: false, message: 'Не удалось отменить заявку' }, { status: 503 });
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.cancelled) {
    return json({ success: false, message: 'Заявку уже обрабатывают — отмена недоступна' }, { status: 409 });
  }
  return json({ success: true, newBalance: Number(result.new_balance) });
}
