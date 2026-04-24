create table if not exists public.signup_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address text,
  user_agent text,
  status text not null check (
    status in ('success', 'failure', 'blocked_rate_limit', 'blocked_captcha')
  ),
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_signup_attempts_ip_created
  on public.signup_attempts (ip_address, created_at desc);

create index if not exists idx_signup_attempts_email_created
  on public.signup_attempts (email, created_at desc);

alter table public.signup_attempts enable row level security;
