-- Durable admin notification center. Additive only: no existing commerce data is changed.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('NEW_ORDER','ORDER_STATUS','PAYMENT_STATUS','LOW_STOCK','COURIER_FAILURE','SYSTEM')),
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  dedupe_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists admin_notifications_created_idx
  on public.admin_notifications(created_at desc);
create index if not exists admin_notifications_unread_idx
  on public.admin_notifications(created_at desc) where read_at is null;

alter table public.admin_notifications enable row level security;
revoke all on public.admin_notifications from anon, authenticated;
grant all on public.admin_notifications to service_role;

comment on table public.admin_notifications is
  'Server-generated operational notifications for administrators. Access only through the authenticated server API.';

create or replace function public.notify_admin_new_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_label text;
  v_customer text;
begin
  v_order_label := case when new.order_number is not null
    then 'ZLX-' || lpad(new.order_number::text, 6, '0')
    else left(new.id::text, 8) end;
  v_customer := coalesce(nullif(new.customer->>'fullName', ''), nullif(new.customer->>'name', ''), 'A customer');
  insert into public.admin_notifications(type, severity, title, message, entity_type, entity_id, dedupe_key, metadata)
  values (
    'NEW_ORDER', 'success', 'New order received',
    v_order_label || ' from ' || v_customer || ' · ৳' || to_char(coalesce(new.grand_total, 0), 'FM999999990.00'),
    'order', new.id::text, 'order:new:' || new.id::text,
    jsonb_build_object('orderNumber', v_order_label, 'amount', new.grand_total, 'status', new.status)
  )
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

drop trigger if exists store_order_admin_notification_insert on public.store_orders;
create trigger store_order_admin_notification_insert
after insert on public.store_orders
for each row execute function public.notify_admin_new_order();

create or replace function public.notify_admin_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_label text;
begin
  v_order_label := case when new.order_number is not null
    then 'ZLX-' || lpad(new.order_number::text, 6, '0')
    else left(new.id::text, 8) end;

  if new.status is distinct from old.status then
    insert into public.admin_notifications(type, severity, title, message, entity_type, entity_id, metadata)
    values (
      'ORDER_STATUS',
      case when new.status in ('CANCELLED','RETURN_REQUESTED','REFUNDED') then 'warning' else 'info' end,
      'Order status changed',
      v_order_label || ' changed from ' || old.status || ' to ' || new.status || '.',
      'order', new.id::text,
      jsonb_build_object('orderNumber', v_order_label, 'oldStatus', old.status, 'status', new.status)
    );
  end if;

  if new.payment_status is distinct from old.payment_status then
    insert into public.admin_notifications(type, severity, title, message, entity_type, entity_id, metadata)
    values (
      'PAYMENT_STATUS',
      case when new.payment_status in ('FAILED','REFUNDED') then 'warning'
           when new.payment_status = 'PAID' then 'success' else 'info' end,
      'Payment status changed',
      v_order_label || ' payment changed from ' || old.payment_status || ' to ' || new.payment_status || '.',
      'order', new.id::text,
      jsonb_build_object('orderNumber', v_order_label, 'oldPaymentStatus', old.payment_status, 'paymentStatus', new.payment_status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists store_order_admin_notification_update on public.store_orders;
create trigger store_order_admin_notification_update
after update of status, payment_status on public.store_orders
for each row execute function public.notify_admin_order_changes();

create or replace function public.notify_admin_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_threshold integer := 5;
  v_name text;
begin
  if coalesce(new.product_data->>'lowStockThreshold', '') ~ '^\d+$' then
    v_threshold := greatest(0, least((new.product_data->>'lowStockThreshold')::integer, 1000000));
  end if;

  if new.stock <= v_threshold and (tg_op = 'INSERT' or old.stock > v_threshold) then
    v_name := coalesce(nullif(new.name, ''), nullif(new.product_data->>'name', ''), new.id);
    insert into public.admin_notifications(type, severity, title, message, entity_type, entity_id, dedupe_key, metadata)
    values (
      'LOW_STOCK', case when new.stock = 0 then 'critical' else 'warning' end,
      case when new.stock = 0 then 'Product out of stock' else 'Low stock alert' end,
      v_name || ' has only ' || new.stock::text || ' item(s) remaining.',
      'product', new.id,
      'low-stock:' || new.id || ':' || current_date::text,
      jsonb_build_object('productId', new.id, 'stock', new.stock, 'threshold', v_threshold)
    )
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists store_product_admin_low_stock_insert on public.store_products;
create trigger store_product_admin_low_stock_insert
after insert on public.store_products
for each row execute function public.notify_admin_low_stock();

drop trigger if exists store_product_admin_low_stock_update on public.store_products;
create trigger store_product_admin_low_stock_update
after update of stock, product_data on public.store_products
for each row execute function public.notify_admin_low_stock();

create or replace function public.notify_admin_courier_failure()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_label text;
begin
  if new.status = 'FAILED' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select case when o.order_number is not null
      then 'ZLX-' || lpad(o.order_number::text, 6, '0')
      else left(o.id::text, 8) end
      into v_order_label
      from public.store_orders o where o.id = new.order_id;

    insert into public.admin_notifications(type, severity, title, message, entity_type, entity_id, metadata)
    values (
      'COURIER_FAILURE', 'critical', 'Pathao booking failed',
      coalesce(v_order_label, left(new.order_id::text, 8)) || ': ' || coalesce(nullif(new.error_message, ''), 'Courier booking failed. Review the shipment before retrying.'),
      'order', new.order_id::text,
      jsonb_build_object('shipmentId', new.id, 'errorCode', new.error_code, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists courier_shipment_admin_notification_insert on public.courier_shipments;
create trigger courier_shipment_admin_notification_insert
after insert on public.courier_shipments
for each row execute function public.notify_admin_courier_failure();

drop trigger if exists courier_shipment_admin_notification_update on public.courier_shipments;
create trigger courier_shipment_admin_notification_update
after update of status on public.courier_shipments
for each row execute function public.notify_admin_courier_failure();
