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

  update public.monthly_usage_counters as counters
  set used_credits = counters.used_credits + p_units
  where counters.user_id = p_user_id
    and counters.period_key = v_period_key
    and counters.used_credits + p_units <= v_credit_limit
  returning counters.used_credits into v_used_credits;

  if v_used_credits is null then
    select counters.used_credits
    into v_used_credits
    from public.monthly_usage_counters as counters
    where counters.user_id = p_user_id
      and counters.period_key = v_period_key;

    return query
    select
      false as allowed,
      greatest(v_credit_limit - coalesce(v_used_credits, 0), 0) as remaining,
      v_credit_limit as credit_limit,
      coalesce(v_used_credits, 0) as used_credits,
      v_period_key as period_key;
    return;
  end if;

  insert into public.usage_events (user_id, period_key, kind, units, metadata_json)
  values (p_user_id, v_period_key, p_kind, p_units, coalesce(p_metadata, '{}'::jsonb));

  return query
  select
    true as allowed,
    greatest(v_credit_limit - v_used_credits, 0) as remaining,
    v_credit_limit as credit_limit,
    v_used_credits as used_credits,
    v_period_key as period_key;
end;
$$;
