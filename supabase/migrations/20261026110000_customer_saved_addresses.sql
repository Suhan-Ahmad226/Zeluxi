-- Saved delivery addresses for one-tap checkout. Additive migration; existing profile/order data is untouched.
create table if not exists public.customer_saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home' check (char_length(label) between 1 and 40),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 10 and 16),
  email text,
  division text not null,
  district text not null,
  upazila text not null,
  address_details text not null check (char_length(address_details) between 5 and 500),
  notes text check (notes is null or char_length(notes) <= 300),
  pathao_city_id integer,
  pathao_zone_id integer,
  pathao_area_id integer,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_saved_addresses_user_idx
  on public.customer_saved_addresses (user_id, is_default desc, created_at desc);
create unique index if not exists customer_saved_addresses_one_default_per_user
  on public.customer_saved_addresses (user_id) where is_default = true;

alter table public.customer_saved_addresses enable row level security;

drop policy if exists "Users can view their saved addresses" on public.customer_saved_addresses;
create policy "Users can view their saved addresses"
  on public.customer_saved_addresses for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can add their saved addresses" on public.customer_saved_addresses;
create policy "Users can add their saved addresses"
  on public.customer_saved_addresses for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their saved addresses" on public.customer_saved_addresses;
create policy "Users can update their saved addresses"
  on public.customer_saved_addresses for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their saved addresses" on public.customer_saved_addresses;
create policy "Users can delete their saved addresses"
  on public.customer_saved_addresses for delete
  to authenticated using (auth.uid() = user_id);

create or replace function public.set_customer_saved_address_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_saved_addresses_updated_at on public.customer_saved_addresses;
create trigger customer_saved_addresses_updated_at
  before update on public.customer_saved_addresses
  for each row execute function public.set_customer_saved_address_updated_at();
