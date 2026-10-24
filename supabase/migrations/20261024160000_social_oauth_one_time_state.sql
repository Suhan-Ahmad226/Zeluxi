create table if not exists public.social_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_oauth_states_expires_at_idx
  on public.social_oauth_states (expires_at);

alter table public.social_oauth_states enable row level security;
revoke all on public.social_oauth_states from anon, authenticated;
grant all on public.social_oauth_states to service_role;

create or replace function public.claim_social_oauth_state(p_state_hash text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.social_oauth_states
       set used_at = now()
     where state_hash = p_state_hash
       and used_at is null
       and expires_at > now()
    returning 1
  )
  select exists (select 1 from claimed);
$$;

revoke all on function public.claim_social_oauth_state(text) from public, anon, authenticated;
grant execute on function public.claim_social_oauth_state(text) to service_role;

-- Expired/used states are short-lived replay-protection records.
