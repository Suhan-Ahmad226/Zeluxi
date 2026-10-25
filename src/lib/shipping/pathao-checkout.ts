import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculatePathaoPrice, getPathaoCities, getPathaoZones, getPathaoAreas, PathaoApiError } from './pathao-server';

export interface CheckoutLine {
  productId: string;
  variantId?: string;
  quantity: number;
}

let cityCache: { expiresAt: number; value: Awaited<ReturnType<typeof getPathaoCities>> } | null = null;
const zoneCache = new Map<number, { expiresAt: number; value: Awaited<ReturnType<typeof getPathaoZones>> }>();
const areaCache = new Map<number, { expiresAt: number; value: Awaited<ReturnType<typeof getPathaoAreas>> }>();
const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;

const normalizeLocation = (value: string) =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export async function quotePathaoCheckout(
  db: SupabaseClient,
  input: { district: string; upazila: string; areaId?: number; requireArea?: boolean; items: CheckoutLine[] },
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

  const now = Date.now();
  if (!cityCache || cityCache.expiresAt <= now) {
    cityCache = { expiresAt: now + LOCATION_CACHE_TTL_MS, value: await getPathaoCities() };
  }
  const cities = cityCache.value;
  const city = cities.find((entry) => normalizeLocation(entry.city_name) === normalizeLocation(input.district));
  if (!city) {
    throw new PathaoApiError('Pathao does not have an exact city match for this district. Contact support to map this delivery area; no estimated rate was invented.', 422, 'PATHAO_CITY_MAPPING_REQUIRED');
  }
  const cityId = Number(city.city_id);
  let cachedZones = zoneCache.get(cityId);
  if (!cachedZones || cachedZones.expiresAt <= now) {
    cachedZones = { expiresAt: now + LOCATION_CACHE_TTL_MS, value: await getPathaoZones(cityId) };
    zoneCache.set(cityId, cachedZones);
  }
  const zones = cachedZones.value;
  const zone = zones.find((entry) => normalizeLocation(entry.zone_name) === normalizeLocation(input.upazila));
  if (!zone) {
    throw new PathaoApiError('Pathao does not have an exact zone match for this thana/upazila. Choose a supported area or ask the store to configure the mapping.', 422, 'PATHAO_ZONE_MAPPING_REQUIRED');
  }

  const zoneId = Number(zone.zone_id);
  let cachedAreas = areaCache.get(zoneId);
  if (!cachedAreas || cachedAreas.expiresAt <= now) {
    cachedAreas = { expiresAt: now + LOCATION_CACHE_TTL_MS, value: await getPathaoAreas(zoneId) };
    areaCache.set(zoneId, cachedAreas);
  }
  const areas = cachedAreas.value.filter((area) => area.home_delivery_available !== false);
  if (input.requireArea && !input.areaId) {
    throw new PathaoApiError('Select a Pathao delivery area for this address before placing the order.', 422, 'PATHAO_AREA_REQUIRED');
  }
  const selectedArea = input.areaId ? areas.find((area) => Number(area.area_id) === input.areaId) : undefined;
  if (input.areaId && !selectedArea) {
    throw new PathaoApiError('The selected Pathao delivery area is not available for this zone. Select the area again.', 422, 'PATHAO_AREA_INVALID');
  }
  if (input.requireArea && areas.length === 0) {
    throw new PathaoApiError('Pathao reports no home-delivery areas for this zone.', 422, 'PATHAO_AREA_UNAVAILABLE');
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
    areaId: selectedArea ? Number(selectedArea.area_id) : undefined,
    areaName: selectedArea?.area_name,
    areas: areas.map((area) => ({ areaId: Number(area.area_id), areaName: area.area_name, pickupAvailable: Boolean(area.pickup_available) })),
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
