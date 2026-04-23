create or replace function public.credit_limit_for_user(
  p_user_id uuid,
  p_now timestamptz default timezone('utc', now())
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with active_subscription as (
    select plans.monthly_credit_limit
    from public.subscriptions
    join public.plans on plans.code = subscriptions.plan_code
    where subscriptions.user_id = p_user_id
      and subscriptions.status = 'active'
      and (subscriptions.starts_at is null or subscriptions.starts_at <= p_now)
      and (subscriptions.ends_at is null or subscriptions.ends_at >= p_now)
      and plans.active = true
    order by subscriptions.ends_at desc nulls last, subscriptions.created_at desc
    limit 1
  )
  select coalesce((select monthly_credit_limit from active_subscription), 5);
$$;

create or replace function public.consume_credits(
  p_user_id uuid,
  p_units integer,
  p_kind text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  allowed boolean,
  remaining integer,
  credit_limit integer,
  used_credits integer,
  period_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_key text := public.current_period_key();
  v_credit_limit integer;
  v_used_credits integer;
begin
  if p_units is null or p_units <= 0 then
    raise exception 'units must be greater than zero';
  end if;

  if p_kind not in ('single', 'bulk') then
    raise exception 'unsupported usage kind';
  end if;

  v_credit_limit := public.credit_limit_for_user(p_user_id);

  insert into public.monthly_usage_counters (user_id, period_key, used_credits)
  values (p_user_id, v_period_key, 0)
  on conflict (user_id, period_key) do nothing;

  update public.monthly_usage_counters
  set used_credits = public.monthly_usage_counters.used_credits + p_units
  where user_id = p_user_id
    and period_key = v_period_key
    and public.monthly_usage_counters.used_credits + p_units <= v_credit_limit
  returning public.monthly_usage_counters.used_credits into v_used_credits;

  if v_used_credits is null then
    select monthly_usage_counters.used_credits
    into v_used_credits
    from public.monthly_usage_counters
    where user_id = p_user_id and period_key = v_period_key;

    return query
    select
      false,
      greatest(v_credit_limit - coalesce(v_used_credits, 0), 0),
      v_credit_limit,
      coalesce(v_used_credits, 0),
      v_period_key;
    return;
  end if;

  insert into public.usage_events (user_id, period_key, kind, units, metadata_json)
  values (p_user_id, v_period_key, p_kind, p_units, coalesce(p_metadata, '{}'::jsonb));

  return query
  select
    true,
    greatest(v_credit_limit - v_used_credits, 0),
    v_credit_limit,
    v_used_credits,
    v_period_key;
end;
$$;
