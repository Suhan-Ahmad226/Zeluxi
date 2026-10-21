-- Persist customer cancellation and return reasons and make cancellation inventory-safe.
-- Safe to re-run. Existing orders are not modified.
alter table public.store_orders
  add column if not exists cancellation_reason text,
  add column if not exists return_reason text,
  add column if not exists inventory_restored_at timestamptz,
  add column if not exists delivered_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_cancellation_reason_length,
  add constraint store_orders_cancellation_reason_length
    check (cancellation_reason is null or char_length(cancellation_reason) <= 1000),
  drop constraint if exists store_orders_return_reason_length,
  add constraint store_orders_return_reason_length
    check (return_reason is null or char_length(return_reason) <= 1000);

create or replace function public.cancel_order_and_restore_inventory(
  p_order_id uuid,
  p_user_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.store_orders%rowtype;
  v_item record;
begin
  if p_order_id is null or p_user_id is null or length(trim(coalesce(p_reason, ''))) < 3 or length(p_reason) > 1000 then
    raise exception 'Invalid cancellation request' using errcode = '22023';
  end if;

  select * into v_order
  from public.store_orders
  where id = p_order_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'Order cannot be cancelled in its current status' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.courier_shipments s
    where s.order_id = p_order_id
      and (s.consignment_id is not null or s.status in ('BOOKING','UNKNOWN','BULK_SUBMITTED','BOOKED','IN_TRANSIT','DELIVERED'))
  ) then
    raise exception 'Order has a courier booking or unresolved booking attempt' using errcode = 'P0001';
  end if;

  -- The order row lock and inventory_restored_at marker make this operation
  -- atomic and prevent concurrent requests from restoring stock twice.
  for v_item in
    select product_id, variant_id, quantity
    from public.store_order_items
    where order_id = p_order_id
    order by product_id, coalesce(variant_id, '')
  loop
    if v_item.variant_id is not null then
      update public.store_products p
      set product_data = jsonb_set(
            coalesce(p.product_data, '{}'::jsonb),
            '{variants}',
            coalesce((
              select jsonb_agg(
                case when variant.value->>'id' = v_item.variant_id
                  then jsonb_set(
                    variant.value,
                    '{stock}',
                    to_jsonb(coalesce(nullif(variant.value->>'stock', '')::integer, 0) + v_item.quantity),
                    true
                  )
                  else variant.value
                end
                order by variant.ordinality
              )
              from jsonb_array_elements(coalesce(p.product_data->'variants', '[]'::jsonb))
                with ordinality as variant(value, ordinality)
            ), '[]'::jsonb),
            true
          ),
          stock = p.stock + v_item.quantity,
          updated_at = now()
      where p.id = v_item.product_id;
    else
      update public.store_products
      set stock = stock + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
    end if;
  end loop;

  update public.store_orders
  set status = 'CANCELLED',
      cancellation_reason = trim(p_reason),
      inventory_restored_at = now()
  where id = p_order_id;

  return jsonb_build_object('orderId', p_order_id, 'status', 'CANCELLED', 'inventoryRestored', true);
end;
$$;

revoke all on function public.cancel_order_and_restore_inventory(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_order_and_restore_inventory(uuid, uuid, text) to service_role;
