-- Durable TON deposit intents and atomic, idempotent game-coin crediting.
-- Safe to run repeatedly in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public._pidr_deposit_intents (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public._pidr_users(id) on delete cascade,
  coin text not null check (coin in ('TON', 'GRAM')),
  destination text not null,
  expected_amount_nano bigint not null check (expected_amount_nano > 0),
  memo text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'ambiguous', 'credited', 'cancelled', 'expired')),
  client_result text,
  tx_hash text unique,
  actual_amount_nano bigint,
  coins_credited bigint,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists _pidr_deposit_intents_reconcile_idx
  on public._pidr_deposit_intents (status, created_at)
  where status in ('pending', 'submitted', 'ambiguous');
create index if not exists _pidr_deposit_intents_user_idx
  on public._pidr_deposit_intents (user_id, created_at desc);

alter table public._pidr_deposit_intents enable row level security;
revoke all on public._pidr_deposit_intents from anon, authenticated;

create or replace function public.credit_verified_ton_deposit(
  p_intent_id uuid,
  p_user_id bigint,
  p_tx_hash text,
  p_from_address text,
  p_destination text,
  p_amount_nano bigint,
  p_coins bigint,
  p_chain_timestamp timestamptz
) returns table(credited boolean, new_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public._pidr_deposit_intents%rowtype;
  v_before bigint;
  v_after bigint;
begin
  if p_tx_hash is null or p_tx_hash = '' or p_amount_nano <= 0 or p_coins <= 0 then
    raise exception 'invalid verified deposit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tx_hash, 0));

  if exists (
    select 1 from public._pidr_crypto_transactions
    where transaction_hash = p_tx_hash
  ) then
    select coins into v_after from public._pidr_users where id = p_user_id;
    return query select false, coalesce(v_after, 0);
    return;
  end if;

  if p_intent_id is not null then
    select * into v_intent
    from public._pidr_deposit_intents
    where id = p_intent_id
    for update;

    if not found
      or v_intent.user_id <> p_user_id
      or v_intent.status not in ('pending', 'submitted', 'ambiguous', 'expired') then
      raise exception 'deposit intent mismatch';
    end if;
  end if;

  select coins into v_before from public._pidr_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;
  v_after := coalesce(v_before, 0) + p_coins;

  insert into public._pidr_crypto_transactions (
    user_id, crypto_type, transaction_hash, wallet_address, amount,
    purpose, status, created_at
  ) values (
    p_user_id, 'TON', p_tx_hash, p_from_address,
    p_amount_nano::numeric / 1000000000,
    'Verified TON deposit: ' || p_coins || ' coins', 'completed', p_chain_timestamp
  );

  update public._pidr_users
  set coins = v_after, updated_at = now()
  where id = p_user_id;

  insert into public._pidr_coin_transactions (
    user_id, amount, transaction_type, description, balance_before, balance_after, created_at
  ) values (
    p_user_id, p_coins, 'deposit', 'Пополнение GRAM', v_before, v_after, p_chain_timestamp
  );

  if p_intent_id is not null then
    update public._pidr_deposit_intents
    set status = 'credited', tx_hash = p_tx_hash, actual_amount_nano = p_amount_nano,
        coins_credited = p_coins, credited_at = now(), updated_at = now()
    where id = p_intent_id;
  end if;

  return query select true, v_after;
end;
$$;

revoke all on function public.credit_verified_ton_deposit(
  uuid, bigint, text, text, text, bigint, bigint, timestamptz
) from public, anon, authenticated;
grant execute on function public.credit_verified_ton_deposit(
  uuid, bigint, text, text, text, bigint, bigint, timestamptz
) to service_role;
