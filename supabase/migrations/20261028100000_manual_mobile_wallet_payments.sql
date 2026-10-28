-- Manual bKash, Nagad and Rocket payment details. Payments stay UNPAID until an admin verifies them.
alter table public.store_orders
  add column if not exists payment_sender_number text,
  add column if not exists transaction_id text;

alter table public.store_orders
  drop constraint if exists store_orders_payment_method_check;

alter table public.store_orders
  add constraint store_orders_payment_method_check
  check (payment_method in ('COD', 'BKASH', 'NAGAD', 'ROCKET'));

create unique index if not exists store_orders_transaction_ref_unique
  on public.store_orders (payment_method, lower(transaction_id))
  where transaction_id is not null;

-- Keep the existing price/stock/coupon RPC authoritative and wrap it in the same transaction.
-- If saving payment metadata fails (including a duplicate transaction ID), order creation rolls back.
create or replace function public.create_customer_order_with_payment(
  p_user_id uuid,
  p_idempotency_key text,
  p_customer jsonb,
  p_items jsonb,
  p_dhaka_fee numeric,
  p_outside_dhaka_fee numeric,
  p_free_shipping_threshold numeric,
  p_expected_subtotal numeric,
  p_shipping_fee numeric,
  p_pathao_fee numeric,
  p_cod_fee numeric,
  p_cod_percentage numeric,
  p_coupon_code text,
  p_payment_method text,
  p_payment_sender_number text,
  p_transaction_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_order_id uuid;
begin
  if p_payment_method not in ('COD', 'BKASH', 'NAGAD', 'ROCKET') then
    raise exception 'Unsupported payment method' using errcode = '22023';
  end if;

  if p_payment_method = 'COD' then
    if nullif(trim(coalesce(p_payment_sender_number, '')), '') is not null
       or nullif(trim(coalesce(p_transaction_id, '')), '') is not null then
      raise exception 'COD orders must not include mobile payment details' using errcode = '22023';
    end if;
  elsif nullif(trim(coalesce(p_payment_sender_number, '')), '') is null
     or nullif(trim(coalesce(p_transaction_id, '')), '') is null then
    raise exception 'Sender wallet number and transaction ID are required' using errcode = '22023';
  end if;

  v_result := public.create_customer_order(
    p_user_id,
    p_idempotency_key,
    p_customer,
    p_items,
    p_dhaka_fee,
    p_outside_dhaka_fee,
    p_free_shipping_threshold,
    p_expected_subtotal,
    p_shipping_fee,
    p_pathao_fee,
    p_cod_fee,
    p_cod_percentage,
    p_coupon_code
  );
  v_order_id := (v_result->>'orderId')::uuid;

  if not coalesce((v_result->>'replayed')::boolean, false) then
    update public.store_orders
    set payment_method = p_payment_method,
        payment_sender_number = case when p_payment_method = 'COD' then null else trim(p_payment_sender_number) end,
        transaction_id = case when p_payment_method = 'COD' then null else upper(trim(p_transaction_id)) end,
        payment_status = 'UNPAID'
    where id = v_order_id and user_id = p_user_id;

    if not found then
      raise exception 'Order payment details could not be saved' using errcode = 'P0001';
    end if;
  end if;

  return v_result;
end;
$$;

revoke all on function public.create_customer_order_with_payment(uuid, text, jsonb, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_customer_order_with_payment(uuid, text, jsonb, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, text, text, text) to service_role;
