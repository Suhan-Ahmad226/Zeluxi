-- Server-authoritative checkout pricing and coupon redemption. Additive only.
alter table public.store_orders
  add column if not exists cod_fee numeric(12,2) not null default 0 check (cod_fee >= 0),
  add column if not exists coupon_code text,
  add column if not exists pathao_delivery_fee numeric(12,2) check (pathao_delivery_fee is null or pathao_delivery_fee >= 0);

create index if not exists store_orders_coupon_code_idx
  on public.store_orders (coupon_code) where coupon_code is not null;

drop function if exists public.create_customer_order(uuid, text, jsonb, jsonb, numeric, numeric, numeric);

create or replace function public.create_customer_order(
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
  p_coupon_code text
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
  v_variant jsonb;
  v_variant_id text;
  v_variant_sku text;
  v_variant_label text;
  v_variant_attributes jsonb;
  v_attribute_text text;
  v_qty integer;
  v_unit_price numeric(12,2);
  v_available_stock integer;
  v_shipping_fee numeric(12,2) := 0;
  v_cod_fee numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_coupon_code text := nullif(upper(trim(coalesce(p_coupon_code, ''))), '');
  v_coupon_data jsonb;
  v_coupon jsonb;
  v_coupon_value numeric(12,2);
  v_coupon_usage integer;
  v_coupon_max_usage integer;
  v_coupon_min_spend numeric(12,2);
  v_coupon_user_key text;
  v_coupon_used_by jsonb;
begin
  if p_user_id is null or length(trim(p_idempotency_key)) < 16 or length(p_idempotency_key) > 128 then
    raise exception 'Invalid order identity or idempotency key' using errcode = '22023';
  end if;
  if jsonb_typeof(p_customer) <> 'object' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid customer or cart payload' using errcode = '22023';
  end if;

  select * into v_existing
  from public.store_orders
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'orderId', v_existing.id, 'status', v_existing.status,
      'grandTotal', v_existing.grand_total, 'subtotal', v_existing.subtotal,
      'shippingFee', v_existing.shipping_fee, 'discount', v_existing.discount,
      'replayed', true
    );
  end if;

  if p_dhaka_fee < 0 or p_dhaka_fee > 2000 or p_outside_dhaka_fee < 0 or p_outside_dhaka_fee > 2000 or p_free_shipping_threshold <= 0 then
    raise exception 'Invalid shipping configuration' using errcode = '22023';
  end if;
  if coalesce(p_customer->>'division', '') not in ('Dhaka','Chattogram','Rajshahi','Sylhet','Khulna','Barishal','Rangpur','Mymensingh') then
    raise exception 'Invalid delivery division' using errcode = '22023';
  end if;

  -- Lock products in a deterministic order to prevent overselling.
  for v_item in
    select value from jsonb_array_elements(p_items)
    order by value->>'productId', coalesce(value->>'variantId', '')
  loop
    if coalesce((v_item->>'quantity')::integer, 0) < 1 or (v_item->>'quantity')::integer > 20 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;

    select * into v_product
    from public.store_products
    where id = v_item->>'productId'
    for update;
    if not found or not v_product.published or v_product.archived then
      raise exception 'A product is unavailable' using errcode = 'P0002';
    end if;

    v_qty := (v_item->>'quantity')::integer;
    v_variant_id := nullif(trim(v_item->>'variantId'), '');
    v_variant := null;

    if jsonb_typeof(v_product.product_data->'variants') = 'array'
       and jsonb_array_length(v_product.product_data->'variants') > 0 then
      if v_variant_id is null then
        raise exception 'Please select a product variant: %', v_product.name using errcode = '22023';
      end if;
      select value into v_variant
      from jsonb_array_elements(v_product.product_data->'variants')
      where value->>'id' = v_variant_id
      limit 1;
      if v_variant is null then
        raise exception 'Selected product variant is unavailable: %', v_product.name using errcode = 'P0002';
      end if;
      v_unit_price := coalesce(nullif(v_variant->>'price', '')::numeric, v_product.price);
      v_available_stock := coalesce(nullif(v_variant->>'stock', '')::integer, 0);
    else
      if v_variant_id is not null then
        raise exception 'Selected product variant is unavailable: %', v_product.name using errcode = 'P0002';
      end if;
      v_unit_price := v_product.price;
      v_available_stock := v_product.stock;
    end if;

    if v_available_stock < v_qty then
      raise exception 'Insufficient stock for product: %', v_product.name using errcode = 'P0001';
    end if;
    v_subtotal := v_subtotal + v_unit_price * v_qty;
  end loop;

  if p_expected_subtotal is null or abs(v_subtotal - p_expected_subtotal) > 0.01 then
    raise exception 'Cart prices changed while checkout was being calculated. Refresh the quote and try again.' using errcode = '40001';
  end if;
  if p_shipping_fee is null or p_shipping_fee < 0 or p_shipping_fee > 2000
     or p_pathao_fee is null or p_pathao_fee < 0 or p_pathao_fee > 2000
     or p_cod_fee is null or p_cod_fee < 0 or p_cod_fee > 2000
     or p_free_shipping_threshold <= 0 then
    raise exception 'Invalid shipping or COD fee configuration' using errcode = '22023';
  end if;
  v_shipping_fee := p_shipping_fee;
  v_cod_fee := p_cod_fee;
  if p_cod_percentage is null or p_cod_percentage < 0 or p_cod_percentage > 10 then
    raise exception 'Invalid Pathao COD percentage' using errcode = '22023';
  end if;

  if v_coupon_code is not null then
    select content_value into v_coupon_data
    from public.store_content where content_key = 'coupons' for update;
    if not found or jsonb_typeof(v_coupon_data) <> 'array' then
      raise exception 'Coupons are temporarily unavailable. Remove the coupon or contact support.' using errcode = '22023';
    end if;
    select value into v_coupon
    from jsonb_array_elements(v_coupon_data)
    where upper(trim(coalesce(value->>'code',''))) = v_coupon_code
    limit 1;
    if v_coupon is null or coalesce((v_coupon->>'active')::boolean, false) is not true then
      raise exception 'This coupon is invalid or inactive.' using errcode = '22023';
    end if;
    if nullif(v_coupon->>'expiresAt','') is not null and (v_coupon->>'expiresAt')::date < current_date then
      raise exception 'This coupon has expired.' using errcode = '22023';
    end if;
    v_coupon_min_spend := coalesce(nullif(v_coupon->>'minSpend','')::numeric, 0);
    if v_subtotal < v_coupon_min_spend then
      raise exception 'This coupon requires a minimum product subtotal of BDT %.', v_coupon_min_spend using errcode = '22023';
    end if;
    v_coupon_usage := coalesce(nullif(v_coupon->>'usageCount','')::integer, 0);
    v_coupon_max_usage := nullif(v_coupon->>'maxUsage','')::integer;
    if v_coupon_max_usage is not null and v_coupon_usage >= v_coupon_max_usage then
      raise exception 'This coupon has reached its usage limit.' using errcode = '22023';
    end if;
    v_coupon_user_key := lower(trim(coalesce(nullif(p_customer->>'email',''), nullif(p_customer->>'phone',''), p_user_id::text)));
    v_coupon_used_by := coalesce(v_coupon->'usedBy', '[]'::jsonb);
    if coalesce(nullif(v_coupon->>'perUserLimit','')::integer, 1) <= 1 and exists (
      select 1 from jsonb_array_elements_text(v_coupon_used_by) as used(value)
      where lower(trim(used.value)) in (
        lower(trim(coalesce(p_customer->>'email',''))),
        lower(trim(coalesce(p_customer->>'phone','')))
      )
    ) then
      raise exception 'This coupon has already been used by this customer.' using errcode = '22023';
    end if;
    v_coupon_value := coalesce(nullif(v_coupon->>'value','')::numeric, 0);
    if v_coupon_value <= 0 then
      raise exception 'This coupon has an invalid discount value.' using errcode = '22023';
    end if;
    if upper(coalesce(v_coupon->>'type','')) = 'PERCENTAGE' then
      if v_coupon_value > 100 then raise exception 'Coupon percentage cannot exceed 100.' using errcode = '22023'; end if;
      v_discount := round(v_subtotal * v_coupon_value / 100, 2);
    elsif upper(coalesce(v_coupon->>'type','')) = 'FIXED' then
      v_discount := least(v_subtotal, v_coupon_value);
    else
      raise exception 'This coupon discount type is not supported.' using errcode = '22023';
    end if;
    v_discount := least(v_subtotal, greatest(0, v_discount));

    update public.store_content
    set content_value = (
      select jsonb_agg(
        case when upper(trim(coalesce(entry.value->>'code',''))) = v_coupon_code then
          jsonb_set(
            jsonb_set(entry.value, '{usageCount}', to_jsonb(coalesce(nullif(entry.value->>'usageCount','')::integer, 0) + 1), true),
            '{usedBy}',
            coalesce(entry.value->'usedBy', '[]'::jsonb) || jsonb_build_array(v_coupon_user_key),
            true
          )
        else entry.value end
        order by entry.ordinality
      )
      from jsonb_array_elements(v_coupon_data) with ordinality as entry(value, ordinality)
    ), updated_at = now()
    where content_key = 'coupons';
  end if;

  if p_cod_percentage > 0 then
    v_cod_fee := ceil(greatest(0, v_subtotal + v_shipping_fee - v_discount) * p_cod_percentage / 100);
  end if;

  insert into public.store_orders(
    user_id, idempotency_key, payment_method, payment_status, customer,
    subtotal, shipping_fee, cod_fee, discount, coupon_code, pathao_delivery_fee, grand_total
  )
  values (
    p_user_id, p_idempotency_key, 'COD', 'UNPAID', p_customer,
    v_subtotal, v_shipping_fee, v_cod_fee, v_discount, v_coupon_code, p_pathao_fee,
    greatest(0, v_subtotal + v_shipping_fee + v_cod_fee - v_discount)
  )
  returning * into v_order;

  for v_item in
    select value from jsonb_array_elements(p_items)
    order by value->>'productId', coalesce(value->>'variantId', '')
  loop
    select * into v_product
    from public.store_products
    where id = v_item->>'productId'
    for update;

    v_qty := (v_item->>'quantity')::integer;
    v_variant_id := nullif(trim(v_item->>'variantId'), '');
    v_variant := null;
    v_variant_sku := null;
    v_variant_label := null;
    v_variant_attributes := '{}'::jsonb;

    if v_variant_id is not null then
      select value into v_variant
      from jsonb_array_elements(coalesce(v_product.product_data->'variants', '[]'::jsonb))
      where value->>'id' = v_variant_id
      limit 1;
      v_unit_price := coalesce(nullif(v_variant->>'price', '')::numeric, v_product.price);
      v_variant_sku := nullif(v_variant->>'sku', '');
      v_variant_attributes := coalesce(v_variant->'attributes', '{}'::jsonb);
      select string_agg(initcap(key) || ': ' || value, ', ' order by key)
        into v_attribute_text
        from jsonb_each_text(v_variant_attributes);
      v_variant_label := concat_ws(' · ', nullif(v_variant->>'name', ''), nullif(v_attribute_text, ''));

      update public.store_products
      set product_data = jsonb_set(
            coalesce(product_data, '{}'::jsonb),
            '{variants}',
            coalesce((
              select jsonb_agg(
                case when variant.value->>'id' = v_variant_id
                  then jsonb_set(
                    variant.value,
                    '{stock}',
                    to_jsonb(greatest(coalesce(nullif(variant.value->>'stock', '')::integer, 0) - v_qty, 0)),
                    true
                  )
                  else variant.value
                end
                order by variant.ordinality
              )
              from jsonb_array_elements(coalesce(product_data->'variants', '[]'::jsonb))
                with ordinality as variant(value, ordinality)
            ), '[]'::jsonb),
            true
          ),
          stock = greatest(stock - v_qty, 0),
          updated_at = now()
      where id = v_product.id;
    else
      v_unit_price := v_product.price;
      update public.store_products
      set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;
    end if;

    insert into public.store_order_items(
      order_id, product_id, product_name, unit_price, quantity,
      variant_id, variant_label, variant_sku, variant_attributes, image_url,
      product_sku, product_brand, product_description, product_barcode, product_specifications
    )
    values (
      v_order.id, v_product.id, v_product.name, v_unit_price, v_qty,
      v_variant_id, v_variant_label, v_variant_sku, v_variant_attributes, v_product.image_url,
      nullif(v_product.product_data->>'sku', ''),
      nullif(v_product.product_data->>'brand', ''),
      nullif(v_product.product_data->>'description', ''),
      nullif(v_product.product_data->>'barcode', ''),
      coalesce(v_product.product_data->'specifications', '{}'::jsonb)
    );
  end loop;

  return jsonb_build_object(
    'orderId', v_order.id, 'status', v_order.status,
    'grandTotal', v_order.grand_total, 'subtotal', v_order.subtotal,
    'shippingFee', v_order.shipping_fee, 'codFee', v_order.cod_fee,
    'discount', v_order.discount, 'couponCode', v_order.coupon_code,
    'grandTotal', v_order.grand_total, 'replayed', false
  );
end;
$$;

revoke all on function public.create_customer_order(uuid, text, jsonb, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.create_customer_order(uuid, text, jsonb, jsonb, numeric, numeric, numeric, numeric, numeric, numeric, text) to service_role;
