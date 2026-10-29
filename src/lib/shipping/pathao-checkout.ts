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

/**
 * Match customer-entered location names against Pathao's canonical list.
 * Case, whitespace, punctuation and common spelling variants are normalized.
 * Fuzzy matching is deliberately conservative to avoid selecting the wrong city/zone.
 */
const normalizeLocation = (value: string) =>
  value.normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

const LOCATION_ALIASES: Record<string, string[]> = {
  dhaka: ['dacca'],
  chattogram: ['chittagong', 'chatogram', 'chattagram'],
  cumilla: ['comilla', 'kumilla'],
  jashore: ['jessore', 'jashor'],
  barishal: ['barisal'],
  bogura: ['bogra'],
  brahmanbaria: ['brahman bariya', 'brahmonbaria'],
  chapainawabganj: ['nawabganj', 'chapai nawabganj', 'chapai nawab gonj'],
  sirajganj: ['sirajgonj'],
  coxsbazar: ["cox's bazar", 'coxs bazar', 'cox bazar'],
  naogaon: ['nowgaon'],
  narsingdi: ['narshingdi', 'narsindi'],
  netrokona: ['netrakona'],
  satkhira: ['shatkhira'],
  thakurgaon: ['thakur gaon'],
};

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

function locationNameMatches(pathaoName: string, customerName: string): boolean {
  const candidate = normalizeLocation(customerName);
  const canonical = normalizeLocation(pathaoName);
  if (!candidate || !canonical) return false;
  if (candidate === canonical) return true;
  if ((LOCATION_ALIASES[canonical] || []).some((alias) => normalizeLocation(alias) === candidate)) return true;

  const maxDistance = Math.max(candidate.length, canonical.length) >= 10 ? 2 : 1;
  if (Math.min(candidate.length, canonical.length) < 6 || Math.abs(candidate.length - canonical.length) > maxDistance) return false;
  return editDistance(candidate, canonical) <= maxDistance;
}

export async function quotePathaoCheckout(
  db: SupabaseClient,
  input: { division: string; district: string; upazila: string; addressDetails: string; notes?: string; items: CheckoutLine[] },
) {
  const storeId = Number(process.env.PATHAO_STORE_ID || 0);
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
  const fallbackWeightRaw = process.env.PATHAO_DEFAULT_ITEM_WEIGHT_KG;
  const parsedFallbackWeight = fallbackWeightRaw ? Number(fallbackWeightRaw) : null;
  let weightUnavailable = Boolean(fallbackWeightRaw && (!Number.isFinite(Number(parsedFallbackWeight)) || Number(parsedFallbackWeight) <= 0 || Number(parsedFallbackWeight) > 10));
  const fallbackWeight = weightUnavailable ? null : parsedFallbackWeight;

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
    const configuredProductWeight = Number(productData.weightKg || 0);
    const configuredWeight = Number.isFinite(configuredProductWeight) && configuredProductWeight > 0 && configuredProductWeight <= 10
      ? configuredProductWeight : fallbackWeight;
    if (configuredWeight === null || !Number.isFinite(configuredWeight) || configuredWeight <= 0 || configuredWeight > 10) {
      weightUnavailable = true;
    }
    // Placeholder weight is only for a store-fee fallback. Pathao pricing is skipped
    // when the actual parcel weight cannot be established safely.
    const itemWeight = configuredWeight && !weightUnavailable ? configuredWeight : 0.5;
    subtotal += price * item.quantity;
    weightKg += itemWeight * item.quantity;
    totalQuantity += item.quantity;
  }

  weightKg = Math.max(0.5, Math.round(weightKg * 100) / 100);
  const parcelTooHeavy = weightKg > 10;
  const now = Date.now();

  // If Pathao config, location mapping, network, or weight data is unavailable,
  // use only the delivery fee explicitly configured in Store Settings.
  const configuredFallbackQuote = async (reason: 'CITY' | 'ZONE' | 'PATHAO_UNAVAILABLE' | 'WEIGHT_UNAVAILABLE') => {
    const { data: settingsRow, error: settingsError } = await db.from('store_content')
      .select('content_value').eq('content_key', 'settings').maybeSingle();
    if (settingsError) throw new PathaoApiError('Store shipping settings could not be loaded for this address.', 503, 'SHIPPING_SETTINGS_UNAVAILABLE');
    const settings = settingsRow?.content_value && typeof settingsRow.content_value === 'object'
      ? settingsRow.content_value as Record<string, unknown> : {};
    const insideDhaka = normalizeLocation(input.district) === 'dhaka';
    const rawFee = insideDhaka ? settings.shippingDhaka : settings.shippingOutsideDhaka;
    const fallbackFee = Number(rawFee);
    if (rawFee === undefined || rawFee === null || rawFee === '' || !Number.isFinite(fallbackFee) || fallbackFee < 0 || fallbackFee > 2000) {
      throw new PathaoApiError('Pathao could not match this location and the store has no valid fallback shipping fee configured. Please contact the store.', 422, 'SHIPPING_FALLBACK_NOT_CONFIGURED');
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      weightKg,
      totalQuantity,
      cityId: undefined,
      cityName: undefined,
      zoneId: undefined,
      zoneName: undefined,
      areaId: undefined,
      areaName: undefined,
      areas: [],
      pathaoFee: Math.round(fallbackFee * 100) / 100,
      planId: 0,
      codEnabled: true,
      codPercentage: 0,
      additionalCharge: 0,
      price: fallbackFee,
      discount: 0,
      promoDiscount: 0,
      rateSource: 'STORE_FALLBACK' as const,
      mappingIssue: reason,
    };
  };

  if (!Number.isSafeInteger(storeId) || storeId <= 0) return configuredFallbackQuote('PATHAO_UNAVAILABLE');
  if (weightUnavailable || parcelTooHeavy) return configuredFallbackQuote('WEIGHT_UNAVAILABLE');

  try {
    if (!cityCache || cityCache.expiresAt <= now) {
      cityCache = { expiresAt: now + LOCATION_CACHE_TTL_MS, value: await getPathaoCities() };
    }
  } catch {
    return configuredFallbackQuote('PATHAO_UNAVAILABLE');
  }
  const cities = cityCache.value;
  const city = cities.find((entry) => locationNameMatches(entry.city_name, input.district));
  if (!city) return configuredFallbackQuote('CITY');
  const cityId = Number(city.city_id);
  let cachedZones = zoneCache.get(cityId);
  if (!cachedZones || cachedZones.expiresAt <= now) {
    try {
      cachedZones = { expiresAt: now + LOCATION_CACHE_TTL_MS, value: await getPathaoZones(cityId) };
      zoneCache.set(cityId, cachedZones);
    } catch {
      return configuredFallbackQuote('PATHAO_UNAVAILABLE');
    }
  }
  const zones = cachedZones.value;
  const zone = zones.find((entry) => locationNameMatches(entry.zone_name, input.upazila));
  if (!zone) return configuredFallbackQuote('ZONE');

  const zoneId = Number(zone.zone_id);
  let cachedAreas = areaCache.get(zoneId);
  if (!cachedAreas || cachedAreas.expiresAt <= now) {
    try {
      cachedAreas = { expiresAt: now + LOCATION_CACHE_TTL_MS, value: await getPathaoAreas(zoneId) };
      areaCache.set(zoneId, cachedAreas);
    } catch {
      return configuredFallbackQuote('PATHAO_UNAVAILABLE');
    }
  }
  const areas = cachedAreas.value.filter((area) => area.home_delivery_available === true || Number(area.home_delivery_available) === 1);
  const addressText = normalizeLocation([input.addressDetails, input.upazila, input.district, input.notes || ''].join(' '));
  const rankedAreas = areas.map((area) => {
    const name = normalizeLocation(area.area_name);
    const exact = name.length > 0 && addressText.includes(name) ? 1000 + name.length : 0;
    const tokens = String(area.area_name || '').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
    const overlap = tokens.filter((token) => addressText.includes(token)).length;
    return { area, score: exact + overlap };
  }).sort((a, b) => b.score - a.score || String(a.area.area_name).localeCompare(String(b.area.area_name)));
  const bestArea = rankedAreas[0];
  const hasUnambiguousMatch = rankedAreas.length === 1 || (bestArea && bestArea.score > 0 && (rankedAreas[1]?.score ?? -1) < bestArea.score);
  // Area is optional for Pathao's price-plan endpoint. Never block checkout just
  // because the free-text address cannot be mapped confidently to a Pathao area.
  // We only attach an area ID when the match is unambiguous and home delivery is supported.
  const selectedArea = hasUnambiguousMatch ? bestArea?.area : undefined;

  let rate: Awaited<ReturnType<typeof calculatePathaoPrice>>;
  try {
    rate = await calculatePathaoPrice({
      storeId,
      itemType: 2,
      deliveryType: 48,
      weightKg,
      cityId: Number(city.city_id),
      zoneId: Number(zone.zone_id),
    });
  } catch {
    return configuredFallbackQuote('PATHAO_UNAVAILABLE');
  }
  if (Number(rate.cod_enabled) !== 1) {
    throw new PathaoApiError('Pathao does not support COD for this delivery plan. Choose another supported area or contact the store.', 422, 'PATHAO_COD_UNAVAILABLE');
  }
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
    rateSource: 'PATHAO' as const,
  };
}
