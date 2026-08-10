-- Durable Wallet Pay orders and atomic, idempotent deposit crediting.
-- Run in Supabase SQL Editor before enabling WALLET_PAY_API_KEY.
create table if not exists public._pidr_wallet_pay_orders (
  external_id text primary key,
  wallet_pay_order_id text not null unique,
  user_id bigint not null references public._pidr_users(id) on delete cascade,
  telegram_user_id bigint,
  coin text not null check (coin in ('TON', 'USDT', 'BTC')),
  crypto_amount numeric not null check (crypto_amount > 0),
  game_coins bigint not null check (game_coins > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired')),
  pay_link text,
  webhook_event_id text unique,
  order_type text not null default 'deposit',
  listing_id bigint,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public._pidr_wallet_pay_orders
  add column if not exists webhook_event_id text,
  add column if not exists order_type text not null default 'deposit',
  add column if not exists listing_id bigint,
  add column if not exists paid_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

create index if not exists _pidr_wallet_pay_user_idx
  on public._pidr_wallet_pay_orders (user_id, created_at desc);
create unique index if not exists _pidr_wallet_pay_event_idx
  on public._pidr_wallet_pay_orders (webhook_event_id)
  where webhook_event_id is not null;
alter table public._pidr_wallet_pay_orders enable row level security;
revoke all on public._pidr_wallet_pay_orders from anon, authenticated;

create or replace function public.credit_verified_wallet_pay_order(
  p_external_id text,
  p_event_id text
) returns table(credited boolean, new_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public._pidr_wallet_pay_orders%rowtype;
  v_before bigint;
  v_after bigint;
begin
  if p_external_id is null or p_external_id = '' then
    raise exception 'missing external id';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_external_id, 0));
  select * into v_order
  from public._pidr_wallet_pay_orders
  where external_id = p_external_id
  for update;

  if not found then raise exception 'unknown wallet pay order'; end if;
  if v_order.order_type <> 'deposit' then raise exception 'not a deposit order'; end if;
  if v_order.status = 'paid' then
    select coins into v_after from public._pidr_users where id = v_order.user_id;
    return query select false, coalesce(v_after, 0);
    return;
  end if;
  if v_order.status <> 'pending' then raise exception 'order is not payable'; end if;

  select coins into v_before from public._pidr_users where id = v_order.user_id for update;
  if not found then raise exception 'user not found'; end if;
  v_after := coalesce(v_before, 0) + v_order.game_coins;

  update public._pidr_users set coins = v_after, updated_at = now() where id = v_order.user_id;
  insert into public._pidr_coin_transactions (
    user_id, amount, transaction_type, description, balance_before, balance_after, created_at
  ) values (
    v_order.user_id, v_order.game_coins, 'deposit',
    'Telegram Wallet Pay: ' || v_order.crypto_amount || ' ' || v_order.coin,
    v_before, v_after, now()
  );
  insert into public._pidr_crypto_transactions (
    user_id, crypto_type, transaction_hash, wallet_address, amount, purpose, status, created_at
  ) values (
    v_order.user_id, v_order.coin, coalesce(nullif(p_event_id, ''), v_order.external_id),
    'wallet_pay', v_order.crypto_amount, 'Wallet Pay verified deposit', 'completed', now()
  );
  update public._pidr_wallet_pay_orders
    set status = 'paid', paid_at = now(), webhook_event_id = nullif(p_event_id, '')
    where external_id = p_external_id;

  return query select true, v_after;
end;
$$;

revoke all on function public.credit_verified_wallet_pay_order(text, text)
  from public, anon, authenticated;
grant execute on function public.credit_verified_wallet_pay_order(text, text)
  to service_role;
