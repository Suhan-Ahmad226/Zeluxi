-- Pathao Merchant API integration. This migration adds tables only and does not reset commerce data.
create table if not exists public.courier_tokens (
  id integer primary key check (id = 1),
  token_type text not null default 'Bearer',
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.courier_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.store_orders(id) on delete restrict,
  provider text not null default 'PATHAO' check (provider in ('PATHAO')),
  status text not null default 'NOT_BOOKED' check (status in ('NOT_BOOKED','BOOKING','BOOKED','IN_TRANSIT','DELIVERED','FAILED','UNKNOWN','BULK_SUBMITTED','CANCELLED','RETURNED')),
  merchant_order_id text not null unique,
  consignment_id text unique,
  pathao_order_status text,
  delivery_fee numeric(12,2) check (delivery_fee is null or delivery_fee >= 0),
  item_weight_kg numeric(5,2) not null default 0.5 check (item_weight_kg >= 0.5 and item_weight_kg <= 10),
  delivery_type integer not null default 48 check (delivery_type in (48,12)),
  error_code text,
  error_message text,
  request_payload jsonb,
  response_payload jsonb,
  booked_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courier_shipments_status_updated_idx on public.courier_shipments(status, updated_at desc);
create index if not exists courier_shipments_consignment_idx on public.courier_shipments(consignment_id) where consignment_id is not null;
create table if not exists public.courier_shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete restrict,
  provider text not null default 'PATHAO' check (provider in ('PATHAO')),
  event_type text not null,
  status text not null,
  note text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists courier_shipment_events_order_created_idx on public.courier_shipment_events(order_id, created_at desc);
alter table public.courier_tokens enable row level security;
alter table public.courier_shipments enable row level security;
alter table public.courier_shipment_events enable row level security;
revoke all on public.courier_tokens, public.courier_shipments, public.courier_shipment_events from anon, authenticated;
grant all on public.courier_tokens, public.courier_shipments, public.courier_shipment_events to service_role;
comment on table public.courier_tokens is 'OAuth tokens encrypted with PATHAO_TOKEN_ENCRYPTION_KEY; server-side only.';
comment on table public.courier_shipments is 'Canonical shipment state; UNKNOWN must be reconciled before retry to avoid duplicate parcels.';
comment on table public.courier_shipment_events is 'Courier booking and status-sync event history.';
