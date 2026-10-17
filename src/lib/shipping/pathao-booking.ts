import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { createPathaoOrder, PathaoApiError } from '@/src/lib/shipping/pathao-server';

export class PathaoBookingError extends Error {
  constructor(message: string, readonly httpStatus = 502, readonly safeCode = 'BOOKING_FAILED') {
    super(message);
    this.name = 'PathaoBookingError';
  }
}

function adminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new PathaoBookingError('Server database configuration is incomplete.', 503, 'CONFIG_INVALID');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function bookPathaoOrderFromDatabase(
  orderId: string,
  options: { weightKg?: number; deliveryType?: 48 | 12; recipientCity?: number; recipientZone?: number; recipientArea?: number } = {},
) {
  const db = adminDb();
  const deliveryType = options.deliveryType ?? 48;
  const { data: order, error: orderError } = await db.from('store_orders')
    .select('id,status,payment_method,payment_status,customer,grand_total,store_order_items(product_name,quantity,store_products(product_data))')
    .eq('id', orderId).maybeSingle();
  if (orderError) throw new PathaoBookingError('Order could not be loaded from the database.', 503, 'ORDER_READ_FAILED');
  if (!order) throw new PathaoBookingError('Order not found.', 404, 'ORDER_NOT_FOUND');
  const itemRows = (order.store_order_items || []) as Array<{ product_name: string; quantity: number; store_products?: { product_data?: Record<string, unknown> } | null }>;
  const quantity = itemRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (!quantity || itemRows.some((item) => !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
    throw new PathaoBookingError('Order has no valid line items.', 422, 'ORDER_ITEMS_INVALID');
  }
  const configuredFallbackWeight = Number(process.env.PATHAO_DEFAULT_ITEM_WEIGHT_KG || 0.5);
  if (!Number.isFinite(configuredFallbackWeight) || configuredFallbackWeight <= 0 || configuredFallbackWeight > 10) {
    throw new PathaoBookingError('PATHAO_DEFAULT_ITEM_WEIGHT_KG must be greater than 0 and at most 10 kg.', 503, 'CONFIG_INVALID');
  }
  const calculatedWeight = itemRows.reduce((sum, item) => {
    const storedWeight = Number(item.store_products?.product_data?.weightKg || 0);
    const itemWeight = Number.isFinite(storedWeight) && storedWeight > 0 ? storedWeight : configuredFallbackWeight;
    return sum + itemWeight * Number(item.quantity);
  }, 0);
  const weightKg = options.weightKg ?? Math.max(0.5, Math.round(calculatedWeight * 100) / 100);
  if (!Number.isFinite(weightKg) || weightKg < 0.5 || weightKg > 10) {
    throw new PathaoBookingError('Calculated parcel weight is ' + weightKg + ' kg. Pathao accepts 0.5–10 kg per parcel. Set accurate product weights or split this order before accepting it.', 422, 'PARCEL_WEIGHT_OUT_OF_RANGE');
  }
  if (!['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED'].includes(String(order.status))) {
    throw new PathaoBookingError('Order status ' + order.status + ' is not eligible for Pathao booking.', 409, 'ORDER_NOT_ELIGIBLE');
  }

  const { data: existing, error: existingError } = await db.from('courier_shipments')
    .select('*').eq('order_id', orderId).maybeSingle();
  if (existingError) throw new PathaoBookingError('Courier shipment status could not be checked. Apply the courier migration.', 503, 'SHIPMENT_READ_FAILED');
  if (existing && ['BOOKED', 'IN_TRANSIT', 'DELIVERED'].includes(String(existing.status)) && existing.consignment_id) {
    if (String(order.status) !== 'SHIPPED' && String(order.status) !== 'OUT_FOR_DELIVERY' && String(order.status) !== 'DELIVERED') {
      const { error: orderRepairError } = await db.from('store_orders').update({ status: 'SHIPPED' }).eq('id', orderId);
      if (orderRepairError) throw new PathaoBookingError('Pathao booking exists, but the local order status could not be reconciled. Sync the shipment before retrying.', 503, 'BOOKING_PERSISTENCE_PARTIAL');
    }
    return { alreadyBooked: true, orderId, consignmentId: existing.consignment_id, status: existing.pathao_order_status || existing.status, deliveryFee: Number(existing.delivery_fee || 0) };
  }
  if (String(order.status) === 'SHIPPED' || String(order.status) === 'OUT_FOR_DELIVERY' || String(order.status) === 'DELIVERED') {
    throw new PathaoBookingError('Order is already marked as shipped/delivered but has no confirmed Pathao consignment. Reconcile manually; do not create another parcel.', 409, 'ORDER_SHIPMENT_STATE_MISMATCH');
  }
  if (existing && ['UNKNOWN', 'BULK_SUBMITTED', 'BOOKING'].includes(String(existing.status))) {
    throw new PathaoBookingError('Booking is in progress or its outcome is unresolved. Reconcile this order in Pathao before retrying.', 409, 'BOOKING_OUTCOME_UNRESOLVED');
  }

  const merchantOrderId = existing?.merchant_order_id || ('ZLX-' + orderId.replace(/-/g, '').slice(0, 18).toUpperCase());
  if (existing) {
    const { data: claimed, error: claimError } = await db.from('courier_shipments')
      .update({ status: 'BOOKING', error_code: null, error_message: null, item_weight_kg: weightKg, delivery_type: deliveryType, updated_at: new Date().toISOString() })
      .eq('order_id', orderId).eq('status', 'FAILED').select('id').maybeSingle();
    if (claimError || !claimed) throw new PathaoBookingError('Shipment booking could not be claimed. Refresh and check the latest status.', 409, 'BOOKING_CLAIM_FAILED');
  } else {
    const { error: insertError } = await db.from('courier_shipments').insert({
      order_id: orderId, provider: 'PATHAO', status: 'BOOKING', merchant_order_id: merchantOrderId,
      item_weight_kg: weightKg, delivery_type: deliveryType,
    });
    if (insertError) throw new PathaoBookingError('A shipment may already exist for this order. Refresh and check its latest status.', 409, 'BOOKING_CLAIM_FAILED');
  }

  const { data: shipment, error: shipmentError } = await db.from('courier_shipments').select('*').eq('order_id', orderId).single();
  if (shipmentError || !shipment) throw new PathaoBookingError('Shipment record could not be loaded.', 503, 'SHIPMENT_READ_FAILED');

  try {
    const customer = (order.customer || {}) as Record<string, unknown>;
    const address = [customer.addressDetails, customer.thanaCity, customer.district, customer.division, customer.postalCode, 'Bangladesh']
      .filter((part) => typeof part === 'string' && part.trim()).join(', ');
    const result = await createPathaoOrder({
      storeId: Number(process.env.PATHAO_STORE_ID || 0),
      merchantOrderId: shipment.merchant_order_id,
      recipientName: String(customer.fullName || ''),
      recipientPhone: String(customer.phone || ''),
      recipientAddress: address,
      recipientCity: options.recipientCity,
      recipientZone: options.recipientZone,
      recipientArea: options.recipientArea,
      deliveryType,
      itemType: 2,
      specialInstruction: typeof customer.notes === 'string' ? customer.notes : undefined,
      itemQuantity: quantity,
      weightKg,
      amountToCollect: order.payment_method === 'COD' && order.payment_status !== 'PAID' ? Math.round(Number(order.grand_total)) : 0,
      itemDescription: itemRows.map((item) => String(item.product_name) + ' x' + item.quantity).join(', ').slice(0, 500),
    });
    const now = new Date().toISOString();
    const { error: persistError } = await db.from('courier_shipments').update({
      status: 'BOOKED', consignment_id: result.consignmentId, pathao_order_status: result.status,
      delivery_fee: result.deliveryFee, response_payload: result.response, booked_at: now,
      last_synced_at: now, error_code: null, error_message: null, updated_at: now,
    }).eq('order_id', orderId);
    if (persistError) {
      throw new PathaoBookingError('Pathao accepted the shipment but local persistence failed. Do not retry; reconcile the consignment in Pathao.', 409, 'BOOKING_PERSISTENCE_UNKNOWN');
    }
    const { error: orderUpdateError } = await db.from('store_orders').update({ status: 'SHIPPED' }).eq('id', orderId);
    const { error: eventError } = await db.from('courier_shipment_events').insert({
      order_id: orderId, provider: 'PATHAO', event_type: 'BOOKED', status: result.status,
      note: 'Shipment booking confirmed by Pathao API.', payload: result.response,
    });
    if (orderUpdateError || eventError) {
      throw new PathaoBookingError('Pathao booking succeeded, but local order history could not be fully updated. Do not retry; reconcile the shipment.', 409, 'BOOKING_PERSISTENCE_PARTIAL');
    }
    return { alreadyBooked: false, orderId, consignmentId: result.consignmentId, status: result.status, deliveryFee: result.deliveryFee };
  } catch (error) {
    const unknown = error instanceof PathaoApiError
      ? error.safeCode === 'PATHAO_OUTCOME_UNKNOWN' || (Boolean(error.status) && error.status! >= 500)
      : error instanceof PathaoBookingError && error.safeCode.startsWith('BOOKING_PERSISTENCE');
    const safeError = error instanceof Error ? error.message : 'Pathao booking failed unexpectedly.';
    const shipmentStatus = unknown ? 'UNKNOWN' : 'FAILED';
    const { error: stateError } = await db.from('courier_shipments').update({
      status: shipmentStatus,
      error_code: error instanceof PathaoApiError || error instanceof PathaoBookingError ? error.safeCode : 'UNEXPECTED_ERROR',
      error_message: safeError.slice(0, 300), updated_at: new Date().toISOString(),
    }).eq('order_id', orderId);
    await db.from('courier_shipment_events').insert({
      order_id: orderId, provider: 'PATHAO', event_type: unknown ? 'OUTCOME_UNKNOWN' : 'BOOKING_FAILED',
      status: shipmentStatus, note: safeError.slice(0, 300),
    });
    if (stateError) throw new PathaoBookingError('Booking failed or is uncertain, and its state could not be persisted. Check Pathao and the database before retrying.', 503, 'BOOKING_STATE_PERSISTENCE_FAILED');
    if (error instanceof PathaoBookingError) throw error;
    if (error instanceof PathaoApiError) {
      throw new PathaoBookingError(unknown ? safeError + ' Do not retry until the order is reconciled in Pathao.' : safeError, unknown ? 409 : (error.status || 502), error.safeCode);
    }
    throw new PathaoBookingError(safeError, 502, 'BOOKING_FAILED');
  }
}
