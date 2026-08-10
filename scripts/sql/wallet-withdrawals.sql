-- Authenticated withdrawal requests with atomic balance reservation/refund.
-- Run in Supabase SQL Editor before deploying the wallet UI.
create extension if not exists pgcrypto;

create table if not exists public._pidr_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public._pidr_users(id) on delete cascade,
  amount_coins bigint not null check (amount_coins > 0),
  method text not null,
  asset text,
  network text,
  destination text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  tx_hash text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists _pidr_withdrawals_user_idx
  on public._pidr_withdrawal_requests (user_id, created_at desc);
create index if not exists _pidr_withdrawals_queue_idx
  on public._pidr_withdrawal_requests (status, created_at)
  where status in ('pending', 'processing');

alter table public._pidr_withdrawal_requests enable row level security;
revoke all on public._pidr_withdrawal_requests from anon, authenticated;

create or replace function public.create_wallet_withdrawal(
  p_user_id bigint,
  p_amount_coins bigint,
  p_method text,
  p_asset text,
  p_network text,
  p_destination text
) returns table(request_id uuid, new_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before bigint;
  v_after bigint;
  v_request_id uuid;
begin
  if p_amount_coins <= 0 or p_destination is null or btrim(p_destination) = '' then
    raise exception 'invalid withdrawal';
  end if;

  select coins into v_before from public._pidr_users where id = p_user_id for update;
  if not found then raise exception 'user not found'; end if;
  if coalesce(v_before, 0) < p_amount_coins then raise exception 'insufficient balance'; end if;
  v_after := v_before - p_amount_coins;

  insert into public._pidr_withdrawal_requests (
    user_id, amount_coins, method, asset, network, destination
  ) values (
    p_user_id, p_amount_coins, p_method, p_asset, p_network, btrim(p_destination)
  ) returning id into v_request_id;

  update public._pidr_users set coins = v_after, updated_at = now() where id = p_user_id;
  insert into public._pidr_coin_transactions (
    user_id, amount, transaction_type, description, balance_before, balance_after, created_at
  ) values (
    p_user_id, -p_amount_coins, 'withdrawal',
    'Заявка на вывод ' || v_request_id::text, v_before, v_after, now()
  );

  return query select v_request_id, v_after;
end;
$$;

create or replace function public.cancel_wallet_withdrawal(
  p_user_id bigint,
  p_request_id uuid
) returns table(cancelled boolean, new_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public._pidr_withdrawal_requests%rowtype;
  v_before bigint;
  v_after bigint;
begin
  select * into v_request
  from public._pidr_withdrawal_requests
  where id = p_request_id and user_id = p_user_id
  for update;

  if not found or v_request.status <> 'pending' then
    select coins into v_after from public._pidr_users where id = p_user_id;
    return query select false, coalesce(v_after, 0);
    return;
  end if;

  select coins into v_before from public._pidr_users where id = p_user_id for update;
  v_after := coalesce(v_before, 0) + v_request.amount_coins;
  update public._pidr_users set coins = v_after, updated_at = now() where id = p_user_id;
  update public._pidr_withdrawal_requests
    set status = 'cancelled', updated_at = now()
    where id = p_request_id;
  insert into public._pidr_coin_transactions (
    user_id, amount, transaction_type, description, balance_before, balance_after, created_at
  ) values (
    p_user_id, v_request.amount_coins, 'withdrawal_refund',
    'Отмена заявки на вывод ' || p_request_id::text, v_before, v_after, now()
  );

  return query select true, v_after;
end;
$$;

revoke all on function public.create_wallet_withdrawal(bigint, bigint, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_wallet_withdrawal(bigint, bigint, text, text, text, text)
  to service_role;
revoke all on function public.cancel_wallet_withdrawal(bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_wallet_withdrawal(bigint, uuid)
  to service_role;
