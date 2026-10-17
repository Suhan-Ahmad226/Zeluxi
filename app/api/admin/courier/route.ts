import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  calculatePathaoPrice, createPathaoOrder, getPathaoCities, getPathaoConfigStatus,
  getPathaoOrderInfo, getPathaoStores, getPathaoZones, getPathaoAreas, PathaoApiError, testPathaoConnection,
} from '@/src/lib/shipping/pathao-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('test') }).strict(),
  z.object({ action: z.literal('stores') }).strict(),
  z.object({ action: z.literal('cities') }).strict(),
  z.object({ action: z.literal('zones'), cityId: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('areas'), zoneId: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('price'), cityId: z.number().int().positive(), zoneId: z.number().int().positive(), weightKg: z.number().min(0.5).max(10), deliveryType: z.union([z.literal(48), z.literal(12)]).default(48) }).strict(),
  z.object({ action: z.literal('book'), orderId: z.string().uuid(), weightKg: z.number().min(0.5).max(10).default(0.5), deliveryType: z.union([z.literal(48), z.literal(12)]).default(48), recipientCity: z.number().int().positive().optional(), recipientZone: z.number().int().positive().optional(), recipientArea: z.number().int().positive().optional() }).strict(),
  z.object({ action: z.literal('sync'), orderId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('bulk'), orderIds: z.array(z.string().uuid()).min(1).max(20), weightKg: z.number().min(0.5).max(10).default(0.5) }).strict(),
]);
function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
function adminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database configuration is incomplete.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function requireAdmin(request: NextRequest) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(match[1]);
  return !error && Boolean(data.user) && String(data.user?.app_metadata?.role || '').toUpperCase() === 'ADMIN';
}
function mapPathaoStatus(raw: string): string | null {
  const s = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (['delivered', 'delivered_successfully', 'partial_delivered', 'partially_delivered'].includes(s)) return 'DELIVERED';
  if (['in_transit', 'picked', 'picked_up', 'received_at_hub', 'transferred_to_hub'].includes(s)) return 'SHIPPED';
  if (['out_for_delivery', 'assigned_for_delivery', 'on_the_way'].includes(s)) return 'OUT_FOR_DELIVERY';
  if (['cancelled', 'canceled'].includes(s)) return 'CANCELLED';
  if (['returned', 'return'].includes(s)) return 'RETURNED';
  return null;
}
export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return jsonError('Administrator access is required.', 403);
  try {
    const db = adminDb();
    const config = getPathaoConfigStatus();
    const { data: shipments, error } = await db.from('courier_shipments').select('id,order_id,status,consignment_id,delivery_fee,updated_at,merchant_order_id').order('updated_at', { ascending: false }).limit(100);
    if (error && !/does not exist|schema cache/i.test(error.message)) return jsonError('Courier shipment history could not be loaded.', 503);
    return NextResponse.json({ ...config, shipments: shipments || [] }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (e) { return jsonError(e instanceof Error ? e.message : 'Courier service is unavailable.', 503); }
}
export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) return jsonError('Administrator access is required.', 403);
  const raw = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return jsonError('Invalid courier action or parameters.', 400);
  const input = parsed.data;
  try {
    const db = adminDb();
    if (input.action === 'test') {
      const result = await testPathaoConnection();
      return NextResponse.json({ success: true, message: 'Pathao connection verified. ' + result.storeCount + ' merchant store(s) returned.', stores: result.stores }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'stores') {
      const stores = await getPathaoStores();
      return NextResponse.json({ success: true, message: stores.length + ' merchant store(s) loaded from Pathao.', stores }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'cities') return NextResponse.json({ cities: await getPathaoCities() }, { headers: { 'Cache-Control': 'no-store' } });
    if (input.action === 'zones') return NextResponse.json({ zones: await getPathaoZones(input.cityId) }, { headers: { 'Cache-Control': 'no-store' } });
    if (input.action === 'areas') return NextResponse.json({ areas: await getPathaoAreas(input.zoneId) }, { headers: { 'Cache-Control': 'no-store' } });
    if (input.action === 'price') {
      const storeId = Number(process.env.PATHAO_STORE_ID || 0);
      if (!storeId) return jsonError('Set PATHAO_STORE_ID to an approved merchant store ID.', 503);
      const quote = await calculatePathaoPrice({ storeId, itemType: 2, deliveryType: input.deliveryType, weightKg: input.weightKg, cityId: input.cityId, zoneId: input.zoneId });
      return NextResponse.json({ quote }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'bulk') {
      return jsonError('Bulk booking is intentionally disabled: the supplied Pathao API response returns only an accepted flag, not individual consignment IDs. Individual booking remains available until a documented reconciliation endpoint is provided.', 501);
    }
    if (input.action === 'book') {
      const { data: order, error: orderError } = await db.from('store_orders').select('id,status,payment_method,payment_status,customer,grand_total,store_order_items(product_name,quantity)').eq('id', input.orderId).maybeSingle();
      if (orderError) return jsonError('Order could not be loaded. Apply the courier database migration.', 503);
      if (!order) return jsonError('Order not found.', 404);
      if (!['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'].includes(String(order.status))) return jsonError('Order status ' + order.status + ' is not eligible for courier booking.', 409);
      const { data: existing, error: existingError } = await db.from('courier_shipments').select('*').eq('order_id', input.orderId).maybeSingle();
      if (existingError) return jsonError('Courier shipment status could not be checked. Apply the courier migration.', 503);
      if (existing && ['BOOKED', 'IN_TRANSIT', 'DELIVERED'].includes(existing.status)) return NextResponse.json({ success: true, message: 'This order already has a booked Pathao shipment.', shipment: existing });
      if (existing && ['UNKNOWN', 'BULK_SUBMITTED'].includes(existing.status)) return jsonError('Booking outcome is unresolved. Reconcile this shipment in Pathao before any retry.', 409);
      if (existing?.status === 'BOOKING') return jsonError('A booking request is already in progress for this order.', 409);
      if (existing) {
        const { data: claimed, error: claimError } = await db.from('courier_shipments').update({ status: 'BOOKING', error_code: null, error_message: null, updated_at: new Date().toISOString() }).eq('order_id', input.orderId).eq('status', 'FAILED').select('id').maybeSingle();
        if (claimError || !claimed) return jsonError('Shipment booking could not be claimed. Refresh and check latest status.', 409);
      } else {
        const merchantOrderId = 'ZLX-' + input.orderId.replace(/-/g, '').slice(0, 18).toUpperCase();
        const { error: insertError } = await db.from('courier_shipments').insert({ order_id: input.orderId, provider: 'PATHAO', status: 'BOOKING', merchant_order_id: merchantOrderId, item_weight_kg: input.weightKg, delivery_type: input.deliveryType });
        if (insertError) return jsonError('A shipment may already exist for this order. Refresh and check its latest status.', 409);
      }
      const { data: shipment, error: shipmentError } = await db.from('courier_shipments').select('*').eq('order_id', input.orderId).single();
      if (shipmentError || !shipment) return jsonError('Shipment record could not be loaded.', 503);
      const customer: any = order.customer || {};
      const itemRows: any[] = order.store_order_items || [];
      const quantity = itemRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (!quantity) {
        await db.from('courier_shipments').update({ status: 'FAILED', error_code: 'ORDER_ITEMS_MISSING', error_message: 'Order has no item rows.', updated_at: new Date().toISOString() }).eq('order_id', input.orderId);
        return jsonError('Order has no valid line items.', 422);
      }
      const address = [customer.addressDetails, customer.thanaCity, customer.district, customer.division, customer.postalCode, 'Bangladesh'].filter(Boolean).join(', ');
      try {
        const result = await createPathaoOrder({
          storeId: Number(process.env.PATHAO_STORE_ID || 0), merchantOrderId: shipment.merchant_order_id,
          recipientName: String(customer.fullName || ''), recipientPhone: String(customer.phone || ''), recipientAddress: address,
          recipientCity: input.recipientCity, recipientZone: input.recipientZone, recipientArea: input.recipientArea,
          deliveryType: input.deliveryType, itemType: 2, specialInstruction: customer.notes ? String(customer.notes) : undefined,
          itemQuantity: quantity, weightKg: input.weightKg,
          amountToCollect: order.payment_method === 'COD' && order.payment_status !== 'PAID' ? Math.round(Number(order.grand_total)) : 0,
          itemDescription: itemRows.map((item) => String(item.product_name) + ' x' + item.quantity).join(', ').slice(0, 500),
        });
        await db.from('courier_shipments').update({ status: 'BOOKED', consignment_id: result.consignmentId, pathao_order_status: result.status, delivery_fee: result.deliveryFee, response_payload: result.response, booked_at: new Date().toISOString(), last_synced_at: new Date().toISOString(), error_code: null, error_message: null, updated_at: new Date().toISOString() }).eq('order_id', input.orderId);
        await db.from('store_orders').update({ status: 'SHIPPED' }).eq('id', input.orderId);
        await db.from('courier_shipment_events').insert({ order_id: input.orderId, provider: 'PATHAO', event_type: 'BOOKED', status: result.status, note: 'Shipment booking confirmed by Pathao API.', payload: result.response });
        return NextResponse.json({ success: true, message: 'Pathao shipment booked successfully.', shipment: { orderId: input.orderId, consignmentId: result.consignmentId, status: result.status, deliveryFee: result.deliveryFee } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
      } catch (e) {
        const unknown = e instanceof PathaoApiError && (e.safeCode === 'PATHAO_OUTCOME_UNKNOWN' || (Boolean(e.status) && e.status! >= 500));
        const safeError = e instanceof PathaoApiError ? e.message : 'Pathao booking failed unexpectedly.';
        await db.from('courier_shipments').update({ status: unknown ? 'UNKNOWN' : 'FAILED', error_code: e instanceof PathaoApiError ? e.safeCode : 'UNEXPECTED_ERROR', error_message: safeError.slice(0, 300), updated_at: new Date().toISOString() }).eq('order_id', input.orderId);
        await db.from('courier_shipment_events').insert({ order_id: input.orderId, provider: 'PATHAO', event_type: unknown ? 'OUTCOME_UNKNOWN' : 'BOOKING_FAILED', status: unknown ? 'UNKNOWN' : 'FAILED', note: safeError.slice(0, 300) });
        return jsonError(unknown ? safeError + ' Do not retry until the order is reconciled in Pathao.' : safeError, unknown ? 409 : (e instanceof PathaoApiError && e.status ? e.status : 502));
      }
    }
    if (input.action === 'sync') {
      const { data: shipment, error } = await db.from('courier_shipments').select('*').eq('order_id', input.orderId).maybeSingle();
      if (error) return jsonError('Courier shipment history could not be loaded.', 503);
      if (!shipment?.consignment_id) return jsonError('This shipment has no confirmed consignment ID. Resolve booking outcome in Pathao first.', 409);
      const info = await getPathaoOrderInfo(shipment.consignment_id);
      const mapped = mapPathaoStatus(String(info.order_status_slug || info.order_status || ''));
      const now = new Date().toISOString();
      await db.from('courier_shipments').update({ status: mapped === 'DELIVERED' ? 'DELIVERED' : mapped === 'SHIPPED' || mapped === 'OUT_FOR_DELIVERY' ? 'IN_TRANSIT' : shipment.status, pathao_order_status: info.order_status_slug || info.order_status, last_synced_at: now, updated_at: now, error_code: null, error_message: null }).eq('order_id', input.orderId);
      if (mapped) await db.from('store_orders').update({ status: mapped }).eq('id', input.orderId);
      await db.from('courier_shipment_events').insert({ order_id: input.orderId, provider: 'PATHAO', event_type: 'STATUS_SYNC', status: mapped || info.order_status_slug || info.order_status, note: 'Status fetched from Pathao order info API.', payload: { updated_at: info.updated_at, invoice_id: info.invoice_id } });
      return NextResponse.json({ success: true, message: 'Pathao status synchronized: ' + (info.order_status_slug || info.order_status), shipment: { orderId: input.orderId, status: mapped || info.order_status_slug || info.order_status, consignmentId: shipment.consignment_id } }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return jsonError('Unsupported courier action.', 400);
  } catch (e) {
    const status = e instanceof PathaoApiError && e.status ? e.status : 503;
    return jsonError(e instanceof PathaoApiError ? e.message : 'Courier service is unavailable. Check server configuration.', status);
  }
}
