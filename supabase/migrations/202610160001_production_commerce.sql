-- Zeluxi production commerce foundation.
-- Apply in Supabase SQL Editor before enabling checkout.
create extension if not exists pgcrypto;

create table if not exists public.store_products (
  id text primary key,
  name text not null,
  sku text,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  published boolean not null default false,
  archived boolean not null default false,
  image_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','PROCESSING','READY_TO_SHIP','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED')),
  payment_method text not null check (payment_method in ('COD')),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID','FAILED','REFUNDED')),
  customer jsonb not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_fee numeric(12,2) not null check (shipping_fee >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id text not null references public.store_products(id) on delete restrict,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) generated always as (unit_price * quantity) stored
);

alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "Published products are readable" on public.store_products;
create policy "Published products are readable" on public.store_products for select using (published = true and archived = false);

drop policy if exists "Customers read own orders" on public.store_orders;
create policy "Customers read own orders" on public.store_orders for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Customers read own order items" on public.store_order_items;
create policy "Customers read own order items" on public.store_order_items for select to authenticated using (
  exists (select 1 from public.store_orders o where o.id = order_id and o.user_id = auth.uid())
);

revoke all on public.store_products, public.store_orders, public.store_order_items from anon, authenticated;
grant select on public.store_products to anon, authenticated;
grant select on public.store_orders, public.store_order_items to authenticated;

drop function if exists public.create_customer_order(uuid, text, jsonb, jsonb, numeric);

create or replace function public.create_customer_order(
  p_user_id uuid,
  p_idempotency_key text,
  p_customer jsonb,
  p_items jsonb,
  p_dhaka_fee numeric,
  p_outside_dhaka_fee numeric,
  p_free_shipping_threshold numeric
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.store_orders%rowtype;
  v_order public.store_orders%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product public.store_products%rowtype;
  v_qty integer;
  v_shipping_fee numeric(12,2) := 0;
begin
  if p_user_id is null or length(trim(p_idempotency_key)) < 16 or length(p_idempotency_key) > 128 then
    raise exception 'Invalid order identity or idempotency key' using errcode = '22023';
  end if;
  if jsonb_typeof(p_customer) <> 'object' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid customer or cart payload' using errcode = '22023';
  end if;
  select * into v_existing from public.store_orders where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('orderId', v_existing.id, 'status', v_existing.status, 'grandTotal', v_existing.grand_total, 'replayed', true);
  end if;
  if p_dhaka_fee < 0 or p_dhaka_fee > 2000 or p_outside_dhaka_fee < 0 or p_outside_dhaka_fee > 2000 or p_free_shipping_threshold <= 0 then
    raise exception 'Invalid shipping configuration' using errcode = '22023';
  end if;
  if coalesce(p_customer->>'division', '') not in ('Dhaka','Chattogram','Rajshahi','Sylhet','Khulna','Barishal','Rangpur','Mymensingh') then
    raise exception 'Invalid delivery division' using errcode = '22023';
  end if;

  -- Lock products in a deterministic order to prevent overselling and reduce deadlocks.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    if coalesce((v_item->>'quantity')::integer, 0) < 1 or (v_item->>'quantity')::integer > 20 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;
    select * into v_product from public.store_products where id = v_item->>'productId' for update;
    if not found or not v_product.published or v_product.archived then
      raise exception 'A product is unavailable' using errcode = 'P0002';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for product: %', v_product.name using errcode = 'P0001';
    end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_shipping_fee := case
    when v_subtotal >= p_free_shipping_threshold then 0
    when p_customer->>'division' = 'Dhaka' then p_dhaka_fee
    else p_outside_dhaka_fee
  end;

  insert into public.store_orders(user_id, idempotency_key, payment_method, payment_status, customer, subtotal, shipping_fee, discount, grand_total)
  values (p_user_id, p_idempotency_key, 'COD', 'UNPAID', p_customer, v_subtotal, v_shipping_fee, 0, v_subtotal + v_shipping_fee)
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'productId'
  loop
    select * into v_product from public.store_products where id = v_item->>'productId' for update;
    v_qty := (v_item->>'quantity')::integer;
    update public.store_products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
    insert into public.store_order_items(order_id, product_id, product_name, unit_price, quantity)
    values (v_order.id, v_product.id, v_product.name, v_product.price, v_qty);
  end loop;

  return jsonb_build_object('orderId', v_order.id, 'status', v_order.status, 'grandTotal', v_order.grand_total, 'replayed', false);
end;
$$;

revoke all on function public.create_customer_order(uuid, text, jsonb, jsonb, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.create_customer_order(uuid, text, jsonb, jsonb, numeric, numeric, numeric) to service_role;
