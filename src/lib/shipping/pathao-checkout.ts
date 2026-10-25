import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculatePathaoPrice, getPathaoCities, getPathaoZones, PathaoApiError } from './pathao-server';

export interface CheckoutLine {
  productId: string;
  variantId?: string;
  quantity: number;
}

const normalizeLocation = (value: string) =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export async function quotePathaoCheckout(
  db: SupabaseClient,
  input: { district: string; upazila: string; items: CheckoutLine[] },
) {
  const storeId = Number(process.env.PATHAO_STORE_ID || 0);
  if (!Number.isSafeInteger(storeId) || storeId <= 0) {
    throw new PathaoApiError('Pathao pickup store is not configured. Checkout shipping cannot be quoted.', 503, 'PATHAO_STORE_NOT_CONFIGURED');
  }
  if (!input.items.length || input.items.length > 50) {
    throw new PathaoApiError('Your cart is empty or contains too many line items.', 400, 'CART_INVALID');
  }

  const ids = [...new Set(input.items.map((item) => item.productId))];
  const { data: products, error } = await db.from('store_products')
    .select('id,name,price,stock,published,archived,product_data')
    .in('id', ids);
  if (error) throw new PathaoApiError('Products could not be verified for the shipping quote.', 503, 'PRODUCT_LOOKUP_FAILED');

  const byId = new Map((products || []).map((product: any) => [String(product.id), product]));
  let subtotal = 0;
  let weightKg = 0;
  let totalQuantity = 0;
  const fallbackWeight = Number(process.env.PATHAO_DEFAULT_ITEM_WEIGHT_KG || 0.5);
  if (!Number.isFinite(fallbackWeight) || fallbackWeight <= 0 || fallbackWeight > 10) {
    throw new PathaoApiError('Pathao fallback item weight is not configured correctly.', 503, 'PATHAO_WEIGHT_CONFIG_INVALID');
  }

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw new PathaoApiError('Cart quantity is invalid.', 400, 'CART_QUANTITY_INVALID');
    }
    const product = byId.get(item.productId) as any;
    if (!product || !product.published || product.archived) {
      throw new PathaoApiError('A cart item is no longer available.', 409, 'PRODUCT_UNAVAILABLE');
    }
    const productData = product.product_data && typeof product.product_data === 'object' ? product.product_data : {};
    const variants = Array.isArray(productData.variants) ? productData.variants : [];
    let price = Number(product.price);
    if (variants.length) {
      const variant = variants.find((entry: any) => String(entry?.id || '') === String(item.variantId || ''));
      if (!variant) throw new PathaoApiError('Select a valid option for ' + String(product.name || 'a product') + '.', 409, 'VARIANT_UNAVAILABLE');
      price = Number(variant.price ?? product.price);
      if (!Number.isFinite(Number(variant.stock)) || Number(variant.stock) < item.quantity) {
        throw new PathaoApiError('Insufficient stock for ' + String(product.name || 'a product') + '.', 409, 'INSUFFICIENT_STOCK');
      }
    } else {
      if (item.variantId) throw new PathaoApiError('The selected product option is no longer available.', 409, 'VARIANT_UNAVAILABLE');
      if (!Number.isFinite(Number(product.stock)) || Number(product.stock) < item.quantity) {
        throw new PathaoApiError('Insufficient stock for ' + String(product.name || 'a product') + '.', 409, 'INSUFFICIENT_STOCK');
      }
    }
    if (!Number.isFinite(price) || price < 0) throw new PathaoApiError('A cart item has an invalid price.', 409, 'PRODUCT_PRICE_INVALID');
    const itemWeight = Number(productData.weightKg || fallbackWeight);
    if (!Number.isFinite(itemWeight) || itemWeight <= 0 || itemWeight > 10) {
      throw new PathaoApiError('Product weight is invalid for Pathao shipping.', 422, 'PRODUCT_WEIGHT_INVALID');
    }
    subtotal += price * item.quantity;
    weightKg += itemWeight * item.quantity;
    totalQuantity += item.quantity;
  }

  weightKg = Math.max(0.5, Math.round(weightKg * 100) / 100);
  if (weightKg > 10) {
    throw new PathaoApiError('This parcel exceeds Pathao’s 10 kg limit. Reduce the cart quantity or arrange split shipment.', 422, 'PARCEL_WEIGHT_OUT_OF_RANGE');
  }

  const cities = await getPathaoCities();
  const city = cities.find((entry) => normalizeLocation(entry.city_name) === normalizeLocation(input.district));
  if (!city) {
    throw new PathaoApiError('Pathao does not have an exact city match for this district. Contact support to map this delivery area; no estimated rate was invented.', 422, 'PATHAO_CITY_MAPPING_REQUIRED');
  }
  const zones = await getPathaoZones(Number(city.city_id));
  const zone = zones.find((entry) => normalizeLocation(entry.zone_name) === normalizeLocation(input.upazila));
  if (!zone) {
    throw new PathaoApiError('Pathao does not have an exact zone match for this thana/upazila. Choose a supported area or ask the store to configure the mapping.', 422, 'PATHAO_ZONE_MAPPING_REQUIRED');
  }

  const rate = await calculatePathaoPrice({
    storeId,
    itemType: 2,
    deliveryType: 48,
    weightKg,
    cityId: Number(city.city_id),
    zoneId: Number(zone.zone_id),
  });
  const pathaoFee = Number(rate.final_price);
  if (!Number.isFinite(pathaoFee) || pathaoFee < 0) {
    throw new PathaoApiError('Pathao returned an invalid delivery price. Please retry later.', 502, 'PATHAO_PRICE_INVALID');
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    weightKg,
    totalQuantity,
    cityId: Number(city.city_id),
    cityName: city.city_name,
    zoneId: Number(zone.zone_id),
    zoneName: zone.zone_name,
    pathaoFee: Math.round(pathaoFee * 100) / 100,
    planId: Number(rate.plan_id || 0),
    codEnabled: Number(rate.cod_enabled || 0) === 1,
    codPercentage: Number(rate.cod_percentage || 0),
    additionalCharge: Number(rate.additional_charge || 0),
    price: Number(rate.price || 0),
    discount: Number(rate.discount || 0),
    promoDiscount: Number(rate.promo_discount || 0),
  };
}
