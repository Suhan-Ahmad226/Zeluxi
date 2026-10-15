-- Persistent catalog metadata for the authenticated catalog API.
-- Safe additive migration: existing checkout-critical columns remain canonical.
alter table public.store_products
  add column if not exists product_data jsonb not null default '{}'::jsonb;

create index if not exists store_products_published_updated_idx
  on public.store_products (published, updated_at desc)
  where archived = false;

create unique index if not exists store_products_product_slug_unique
  on public.store_products ((product_data->>'slug'))
  where product_data ? 'slug';

comment on column public.store_products.product_data is
  'Validated catalog metadata written only by the server-side admin API. Price, stock, publication and archive flags are mirrored in dedicated columns used by checkout and RLS.';
