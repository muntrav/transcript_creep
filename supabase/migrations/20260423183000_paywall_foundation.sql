create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plans (
  code text primary key,
  name text not null,
  price_usd numeric(10, 2) not null check (price_usd >= 0),
  monthly_credit_limit integer not null check (monthly_credit_limit > 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  plan_code text not null references public.plans (code),
  status text not null check (status in ('pending_payment', 'active', 'expired', 'cancelled', 'rejected')),
  starts_at timestamptz,
  ends_at timestamptz,
  activated_by uuid references public.user_profiles (id),
  activated_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  plan_code text not null references public.plans (code),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  payer_name text not null,
  payment_reference text not null,
  proof_url text,
  note text,
  admin_note text,
  reviewed_by uuid references public.user_profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  period_key text not null,
  kind text not null check (kind in ('single', 'bulk')),
  units integer not null check (units > 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.monthly_usage_counters (
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  period_key text not null,
  used_credits integer not null default 0 check (used_credits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, period_key)
);

create index if not exists idx_subscriptions_user_status_dates
  on public.subscriptions (user_id, status, starts_at desc, ends_at desc);

create index if not exists idx_payment_requests_user_status_created
  on public.payment_requests (user_id, status, created_at desc);

create index if not exists idx_usage_events_user_period
  on public.usage_events (user_id, period_key, created_at desc);

create index if not exists idx_monthly_usage_counters_user_period
  on public.monthly_usage_counters (user_id, period_key);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists payment_requests_set_updated_at on public.payment_requests;
create trigger payment_requests_set_updated_at
before update on public.payment_requests
for each row execute function public.set_updated_at();

drop trigger if exists monthly_usage_counters_set_updated_at on public.monthly_usage_counters;
create trigger monthly_usage_counters_set_updated_at
before update on public.monthly_usage_counters
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_period_key(ts timestamptz default timezone('utc', now()))
returns text
language sql
stable
as $$
  select to_char(date_trunc('month', ts at time zone 'utc'), 'YYYY-MM');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_requests enable row level security;
alter table public.usage_events enable row level security;
alter table public.monthly_usage_counters enable row level security;

create policy "profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and role = public.user_profiles.role);

create policy "plans_read_all"
on public.plans
for select
to anon, authenticated
using (active = true);

create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

create policy "payment_requests_select_own"
on public.payment_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy "payment_requests_insert_own"
on public.payment_requests
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending_review'
);

create policy "usage_events_select_own"
on public.usage_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "monthly_usage_counters_select_own"
on public.monthly_usage_counters
for select
to authenticated
using (auth.uid() = user_id);
