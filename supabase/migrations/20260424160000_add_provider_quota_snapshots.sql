create table if not exists public.provider_quota_snapshots (
  provider text primary key,
  requests_limit integer,
  requests_remaining integer,
  requests_reset text,
  hard_limit_limit integer,
  hard_limit_remaining integer,
  hard_limit_reset text,
  rapidapi_region text,
  rapidapi_version text,
  rapidapi_request_id text,
  observed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.provider_quota_snapshots enable row level security;

drop trigger if exists provider_quota_snapshots_set_updated_at on public.provider_quota_snapshots;
create trigger provider_quota_snapshots_set_updated_at
before update on public.provider_quota_snapshots
for each row execute function public.set_updated_at();

create index if not exists idx_provider_quota_snapshots_observed_at
  on public.provider_quota_snapshots (observed_at desc);
