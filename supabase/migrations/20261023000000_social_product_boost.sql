-- Zeluxi Social Media Studio: additive migration.
-- Apply to Supabase only after reviewing the target project and taking a backup.
create extension if not exists pgcrypto;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('FACEBOOK_PAGE')),
  provider_account_id text not null,
  account_name text not null,
  access_token_ciphertext text not null,
  token_expires_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  status text not null default 'CONNECTED' check (status in ('CONNECTED','RECONNECT_REQUIRED','DISCONNECTED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_account_id)
);

create table if not exists public.social_promotions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_name_snapshot text not null,
  account_id uuid not null references public.social_accounts(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  interval_days integer not null default 3 check (interval_days between 1 and 90),
  approval_required boolean not null default true,
  auto_publish boolean not null default false,
  max_posts integer check (max_posts is null or max_posts between 1 and 1000),
  posts_published integer not null default 0 check (posts_published >= 0),
  next_run_at timestamptz,
  end_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references public.social_promotions(id) on delete set null,
  product_id text,
  product_price_snapshot numeric(12,2),
  product_stock_snapshot integer,
  account_id uuid not null references public.social_accounts(id) on delete restrict,
  caption text not null default '',
  media_urls jsonb not null default '[]'::jsonb,
  product_url text not null,
  post_kind text not null default 'FEED' check (post_kind in ('FEED','VIDEO')),
  status text not null default 'DRAFT' check (status in ('DRAFT','AWAITING_APPROVAL','SCHEDULED','PUBLISHING','PUBLISHED','FAILED','CANCELLED')),
  scheduled_at timestamptz,
  published_at timestamptz,
  provider_post_id text,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  idempotency_key text unique
);

create table if not exists public.social_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('STARTED','SUCCEEDED','FAILED','UNCERTAIN')),
  provider_post_id text,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(post_id, attempt_number)
);

create table if not exists public.social_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists social_promotions_one_active_per_product_account_idx
  on public.social_promotions(product_id, account_id) where status = 'ACTIVE';

create index if not exists social_posts_status_schedule_idx on public.social_posts(status, scheduled_at);
create index if not exists social_posts_promotion_idx on public.social_posts(promotion_id, created_at desc);
create index if not exists social_promotions_due_idx on public.social_promotions(status, next_run_at) where status = 'ACTIVE';
create index if not exists social_attempts_post_idx on public.social_publish_attempts(post_id, attempt_number desc);

alter table public.social_accounts enable row level security;
alter table public.social_promotions enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_publish_attempts enable row level security;
alter table public.social_audit_logs enable row level security;

-- Social tables are server-only; application routes verify the current user and ADMIN role.
revoke all on public.social_accounts, public.social_promotions, public.social_posts,
  public.social_publish_attempts, public.social_audit_logs from anon, authenticated;
grant all on public.social_accounts, public.social_promotions, public.social_posts,
  public.social_publish_attempts, public.social_audit_logs to service_role;

comment on column public.social_accounts.access_token_ciphertext is 'AES-256-GCM encrypted Page access token; never return to clients.';
