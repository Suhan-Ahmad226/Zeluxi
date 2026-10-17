import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { bookPathaoOrderFromDatabase, PathaoBookingError } from '@/src/lib/shipping/pathao-booking';
import {
  calculatePathaoPrice, createPathaoOrder, createPathaoStore, getPathaoCities, getPathaoConfigStatus,
  getPathaoOrderInfo, getPathaoStores, getPathaoZones, getPathaoAreas, PathaoApiError, testPathaoConnection,
} from '@/src/lib/shipping/pathao-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('test') }).strict(),
  z.object({ action: z.literal('stores') }).strict(),

  z.object({ action: z.literal('createStore'), name: z.string().trim().min(3).max(50), contactName: z.string().trim().min(3).max(50), contactNumber: z.string().regex(/^01[3-9]\d{8}$/), secondaryContact: z.string().regex(/^01[3-9]\d{8}$/).optional(), otpNumber: z.string().regex(/^01[3-9]\d{8}$/).optional(), address: z.string().trim().min(15).max(120), cityId: z.number().int().positive(), zoneId: z.number().int().positive(), areaId: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('cities') }).strict(),
  z.object({ action: z.literal('zones'), cityId: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('areas'), zoneId: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('price'), cityId: z.number().int().positive(), zoneId: z.number().int().positive(), weightKg: z.number().min(0.5).max(10), deliveryType: z.union([z.literal(48), z.literal(12)]).default(48) }).strict(),
  z.object({ action: z.literal('book'), orderId: z.string().uuid(), weightKg: z.number().min(0.5).max(10).optional(), deliveryType: z.union([z.literal(48), z.literal(12)]).default(48), recipientCity: z.number().int().positive().optional(), recipientZone: z.number().int().positive().optional(), recipientArea: z.number().int().positive().optional() }).strict(),
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
  if (['delivered', 'delivered_successfully'].includes(s)) return 'DELIVERED';
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
    if (input.action === 'createStore') {
      const result = await createPathaoStore({ name: input.name, contactName: input.contactName, contactNumber: input.contactNumber, secondaryContact: input.secondaryContact, otpNumber: input.otpNumber, address: input.address, cityId: input.cityId, zoneId: input.zoneId, areaId: input.areaId });
      return NextResponse.json({ success: true, message: result.message, storeName: result.storeName }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
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
      const shipment = await bookPathaoOrderFromDatabase(input.orderId, {
        weightKg: input.weightKg,
        deliveryType: input.deliveryType,
        recipientCity: input.recipientCity,
        recipientZone: input.recipientZone,
        recipientArea: input.recipientArea,
      });
      return NextResponse.json({
        success: true,
        message: shipment.alreadyBooked ? 'This order already has a confirmed Pathao booking.' : 'Pathao shipment booked successfully.',
        shipment: { orderId: input.orderId, consignmentId: shipment.consignmentId, status: shipment.status, deliveryFee: shipment.deliveryFee },
      }, { status: shipment.alreadyBooked ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'sync') {
      const { data: shipment, error } = await db.from('courier_shipments').select('*').eq('order_id', input.orderId).maybeSingle();
      if (error) return jsonError('Courier shipment history could not be loaded.', 503);
      if (!shipment?.consignment_id) return jsonError('This shipment has no confirmed consignment ID. Resolve booking outcome in Pathao first.', 409);
      const { data: order, error: orderReadError } = await db.from('store_orders').select('status').eq('id', input.orderId).maybeSingle();
      if (orderReadError || !order) return jsonError('Order status could not be loaded for safe synchronization.', 503);
      const info = await getPathaoOrderInfo(shipment.consignment_id);
      const pathaoStatus = String(info.order_status_slug || info.order_status || '');
      const mapped = mapPathaoStatus(pathaoStatus);
      const currentOrderStatus = String(order.status || 'PENDING');
      const terminalOrderStatuses = ['CANCELLED', 'RETURNED', 'REFUNDED'];
      const orderRank: Record<string, number> = {
        PENDING: 0, CONFIRMED: 1, PROCESSING: 2, READY_TO_SHIP: 3,
        SHIPPED: 4, OUT_FOR_DELIVERY: 5, DELIVERED: 6,
      };
      let nextOrderStatus = currentOrderStatus;
      if (mapped && !terminalOrderStatuses.includes(currentOrderStatus)) {
        if (mapped === 'RETURNED') nextOrderStatus = 'RETURNED';
        else if (mapped === 'CANCELLED' && currentOrderStatus !== 'DELIVERED') nextOrderStatus = 'CANCELLED';
        else if (mapped === 'DELIVERED' || (orderRank[mapped] ?? -1) >= (orderRank[currentOrderStatus] ?? -1)) nextOrderStatus = mapped;
      }
      let nextShipmentStatus = String(shipment.status);
      if (mapped === 'RETURNED' && currentOrderStatus !== 'CANCELLED') nextShipmentStatus = 'RETURNED';
      else if (mapped === 'CANCELLED' && currentOrderStatus !== 'DELIVERED' && !terminalOrderStatuses.includes(currentOrderStatus)) nextShipmentStatus = 'CANCELLED';
      else if (currentOrderStatus !== 'DELIVERED' && currentOrderStatus !== 'RETURNED' && currentOrderStatus !== 'CANCELLED') {
        if (mapped === 'DELIVERED') nextShipmentStatus = 'DELIVERED';
        else if (mapped === 'SHIPPED' || mapped === 'OUT_FOR_DELIVERY') nextShipmentStatus = 'IN_TRANSIT';
      }
      const now = new Date().toISOString();
      const { error: shipmentUpdateError } = await db.from('courier_shipments').update({
        status: nextShipmentStatus, pathao_order_status: pathaoStatus,
        last_synced_at: now, updated_at: now, error_code: null, error_message: null,
      }).eq('order_id', input.orderId);
      if (shipmentUpdateError) return jsonError('Pathao status was read but could not be saved locally.', 503);
      if (nextOrderStatus !== currentOrderStatus) {
        const { error: orderUpdateError } = await db.from('store_orders').update({ status: nextOrderStatus }).eq('id', input.orderId);
        if (orderUpdateError) return jsonError('Pathao status was read but the order status could not be saved.', 503);
      }
      const { error: eventError } = await db.from('courier_shipment_events').insert({
        order_id: input.orderId, provider: 'PATHAO', event_type: 'STATUS_SYNC',
        status: nextOrderStatus, note: 'Status fetched from Pathao order info API.',
        payload: { pathao_status: pathaoStatus, updated_at: info.updated_at, invoice_id: info.invoice_id },
      });
      if (eventError) return jsonError('Pathao status was synchronized but the event history could not be saved.', 503);
      return NextResponse.json({
        success: true,
        message: 'Pathao status synchronized: ' + pathaoStatus,
        shipment: { orderId: input.orderId, status: nextOrderStatus, consignmentId: shipment.consignment_id },
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return jsonError('Unsupported courier action.', 400);
  } catch (e) {
    const status = e instanceof PathaoBookingError ? e.httpStatus : e instanceof PathaoApiError && e.status ? e.status : 503;
    return jsonError(e instanceof PathaoApiError || e instanceof PathaoBookingError ? e.message : 'Courier service is unavailable. Check server configuration.', status);
  }
}
