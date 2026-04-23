insert into public.plans (code, name, price_usd, monthly_credit_limit, active)
values
  ('starter', 'Starter', 9.99, 100, true),
  ('pro', 'Pro', 19.99, 300, true),
  ('scale', 'Scale', 29.99, 700, true)
on conflict (code) do update
set
  name = excluded.name,
  price_usd = excluded.price_usd,
  monthly_credit_limit = excluded.monthly_credit_limit,
  active = excluded.active,
  updated_at = timezone('utc', now());
