-- Server-authoritative checkout pricing with coupon snapshot.
alter table public.store_orders add column if not exists coupon_code text;

-- Variant-aware order snapshots and invoice line items.
-- Additive and safe for existing orders: legacy rows keep null variant metadata.
alter table public.store_order_items
  add column if not exists variant_id text,
  add column if not exists variant_label text,
  add column if not exists variant_sku text,
  add column if not exists variant_attributes jsonb not null default '{}'::jsonb,
  add column if not exists image_url text,
  add column if not exists product_sku text,
  add column if not exists product_brand text,
  add column if not exists product_description text,
  add column if not exists product_barcode text,
  add column if not exists product_specifications jsonb not null default '{}'::jsonb;

create index if not exists store_order_items_variant_id_idx
  on public.store_order_items (variant_id)
  where variant_id is not null;

create or replace function public.create_customer_order(
  p_user_id uuid,
  p_idempotency_key text,
  p_customer jsonb,
  p_items jsonb,
  p_shipping_fee numeric,
  p_coupon_code text,
  p_coupon_type text,
  p_coupon_value numeric,
  p_coupon_min_spend numeric,
  p_coupon_max_usage integer,
  p_coupon_per_user_limit integer
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
  v_discount numeric(12,2) := 0;
  v_coupon_uses integer := 0;
  v_user_coupon_uses integer := 0;
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

  if p_shipping_fee is null or p_shipping_fee < 0 or p_shipping_fee > 5000
     or coalesce(p_coupon_value, 0) < 0 or coalesce(p_coupon_min_spend, 0) < 0
     or coalesce(p_coupon_per_user_limit, 1) < 1 then
    raise exception 'Invalid checkout pricing' using errcode = '22023';
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

  v_shipping_fee := p_shipping_fee;
  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    if p_coupon_type not in ('PERCENTAGE', 'FIXED') or p_coupon_value <= 0 or v_subtotal < coalesce(p_coupon_min_spend, 0) then
      raise exception 'Coupon is invalid or minimum spend was not met' using errcode = '22023';
    end if;
    select count(*) into v_coupon_uses
      from public.store_orders
      where upper(coupon_code) = upper(trim(p_coupon_code));
    select count(*) into v_user_coupon_uses
      from public.store_orders
      where user_id = p_user_id and upper(coupon_code) = upper(trim(p_coupon_code));
    if p_coupon_max_usage is not null and v_coupon_uses >= p_coupon_max_usage then
      raise exception 'Coupon usage limit has been reached' using errcode = '22023';
    end if;
    if v_user_coupon_uses >= p_coupon_per_user_limit then
      raise exception 'Coupon has already been used the maximum number of times for this account' using errcode = '22023';
    end if;
    v_discount := case
      when p_coupon_type = 'PERCENTAGE' then round(v_subtotal * p_coupon_value / 100, 2)
      else least(v_subtotal, p_coupon_value)
    end;
    v_discount := least(v_subtotal, greatest(0, v_discount));
  end if;

  insert into public.store_orders(user_id, idempotency_key, payment_method, payment_status, customer, subtotal, shipping_fee, discount, coupon_code, grand_total)
  values (p_user_id, p_idempotency_key, 'COD', 'UNPAID', p_customer, v_subtotal, v_shipping_fee, v_discount, nullif(upper(trim(coalesce(p_coupon_code, ''))), ''), greatest(0, v_subtotal + v_shipping_fee - v_discount))
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
    'shippingFee', v_order.shipping_fee, 'discount', v_order.discount,
    'replayed', false
  );
end;
$$;

revoke all on function public.create_customer_order(uuid, text, jsonb, jsonb, numeric, text, text, numeric, numeric, integer, integer) from public, anon, authenticated;
grant execute on function public.create_customer_order(uuid, text, jsonb, jsonb, numeric, text, text, numeric, numeric, integer, integer) to service_role;
