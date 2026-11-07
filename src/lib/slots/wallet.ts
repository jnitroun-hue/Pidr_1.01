import { supabaseAdmin } from '@/lib/supabase';

export type WalletMode = 'coins' | 'gram';

export type WalletResult =
  | { ok: true; balance: number }
  | { ok: false; error: string; status: number };

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

async function readCoins(userId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin.from('_pidr_users').select('coins').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return Number(data.coins || 0);
}

async function readGram(userId: string): Promise<{ units: number } | { error: string; status: number }> {
  const { data, error } = await supabaseAdmin.from('_pidr_slot_balances').select('gram_units').eq('user_id', userId).maybeSingle();
  if (error) return { error: 'Крипто-баланс слотов ещё не создан. Нужно применить SQL из scripts/sql/slots-wallet.sql', status: 503 };
  return { units: Number(data?.gram_units || 0) };
}

/** Списание или зачисление. Ноль только читает баланс. Оптимистичная запись, чтобы два запроса не задвоили выплату. */
export async function changeBalance(userId: string, mode: WalletMode, delta: number): Promise<WalletResult> {
  if (mode === 'coins') {
    const current = await readCoins(userId);
    if (current == null) return { ok: false, error: 'Игрок не найден', status: 404 };
    if (delta < 0 && current < -delta) return { ok: false, error: 'Не хватает монет', status: 400 };
    if (delta === 0) return { ok: true, balance: current };
    const next = money(current + delta);
    const { data, error } = await supabaseAdmin
      .from('_pidr_users')
      .update({ coins: next })
      .eq('id', userId)
      .eq('coins', current)
      .select('coins')
      .maybeSingle();
    if (error || !data) return { ok: false, error: 'Баланс уже изменился, нажмите ещё раз', status: 409 };
    return { ok: true, balance: Number(data.coins) };
  }

  const wallet = await readGram(userId);
  if ('error' in wallet) return { ok: false, error: wallet.error, status: wallet.status };
  if (delta < 0 && wallet.units < -delta) return { ok: false, error: 'Не хватает GRAM', status: 400 };
  if (delta === 0) return { ok: true, balance: wallet.units };
  const next = money(wallet.units + delta);
  const { data: existing } = await supabaseAdmin.from('_pidr_slot_balances').select('user_id').eq('user_id', userId).maybeSingle();
  const write = existing
    ? supabaseAdmin.from('_pidr_slot_balances').update({ gram_units: next, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('gram_units', wallet.units)
    : supabaseAdmin.from('_pidr_slot_balances').insert({ user_id: userId, gram_units: next });
  const { error } = await write;
  if (error) return { ok: false, error: 'Баланс GRAM уже изменился, нажмите ещё раз', status: 409 };
  return { ok: true, balance: next };
}
