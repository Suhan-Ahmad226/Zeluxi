type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type ApiResponse = { setHeader(name: string, value: string): void; status(code: number): ApiResponse; json(payload: unknown): void };
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  division: z.enum(['Dhaka','Chattogram','Rajshahi','Sylhet','Khulna','Barishal','Rangpur','Mymensingh']),
  district: z.string().trim().min(1).max(100),
  thanaCity: z.string().trim().min(1).max(100),
  addressDetails: z.string().trim().min(5).max(1000),
  notes: z.string().trim().max(300).optional(),
});
const checkoutSchema = z.object({
  customer: addressSchema,
  paymentMethod: z.literal('COD'),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(50),
}).strict();
const statusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PENDING','CONFIRMED','PROCESSING','READY_TO_SHIP','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED']),
}).strict();

function getHeader(req: ApiRequest, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function readNonNegativeEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST', 'PATCH'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(503).json({ error: 'Order service is not configured.' });
  }
  const token = getHeader(req, 'authorization').replace(/^Bearer\s+/i, '');
  if (!token || token === getHeader(req, 'authorization')) return res.status(401).json({ error: 'Sign in is required.' });

  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired session.' });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    if (req.method === 'GET') {
      if (String(user.app_metadata?.role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ error: 'Administrator access is required.' });
      }
      const { data, error } = await admin.from('store_orders')
        .select('*, store_order_items(*), courier_shipments(*)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) return res.status(503).json({ error: 'Orders could not be loaded.' });
      const orders = (data || []).map((row: any) => {
        const status = row.status || 'PENDING';
        return {
          id: String(row.id),
          createdAt: row.created_at,
          customer: row.customer || {},
          items: (row.store_order_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            price: Number(item.unit_price),
            quantity: Number(item.quantity),
            image: '',
          })),
          subtotal: Number(row.subtotal),
          shippingFee: Number(row.shipping_fee),
          discount: Number(row.discount || 0),
          grandTotal: Number(row.grand_total),
          status,
          paymentMethod: row.payment_method,
          paymentStatus: row.payment_status,
          courier: (() => {
            const shipment = Array.isArray(row.courier_shipments) ? row.courier_shipments[0] : row.courier_shipments;
            const status = shipment?.status;
            return {
              provider: 'PATHAO',
              trackingCode: shipment?.consignment_id || '',
              consignmentId: shipment?.consignment_id || '',
              estimatedDelivery: '',
              bookingStatus: ['BOOKED','IN_TRANSIT','DELIVERED'].includes(status) ? 'BOOKED' : status === 'BOOKING' ? 'BOOKING_IN_PROGRESS' : status === 'FAILED' || status === 'UNKNOWN' ? 'BOOKING_FAILED' : 'NOT_BOOKED',
              bookingError: shipment?.error_message || undefined,
              deliveryFee: shipment?.delivery_fee == null ? undefined : Number(shipment.delivery_fee),
              bookedAt: shipment?.booked_at || undefined,
              lastSyncedAt: shipment?.last_synced_at || undefined,
            };
          })(),
          statusHistory: [{ status, timestamp: row.created_at, note: 'Loaded from persistent order database.' }],
        };
      });
      return res.status(200).json({ orders });
    }

    if (req.method === 'PATCH') {
      if (String(user.app_metadata?.role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ error: 'Administrator access is required.' });
      }
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid order status update.' });
      const { data, error } = await admin.from('store_orders')
        .update({ status: parsed.data.status })
        .eq('id', parsed.data.orderId)
        .select('id,status')
        .maybeSingle();
      if (error || !data) return res.status(404).json({ error: 'Order status could not be updated.' });
      return res.status(200).json({ order: { id: data.id, status: data.status } });
    }

    if (!user.email_confirmed_at) return res.status(401).json({ error: 'A verified account is required.' });
    const dhakaFee = readNonNegativeEnv('SHIPPING_DHAKA_FEE');
    const outsideDhakaFee = readNonNegativeEnv('SHIPPING_OUTSIDE_DHAKA_FEE');
    const freeShippingThreshold = readNonNegativeEnv('FREE_SHIPPING_THRESHOLD');
    if (dhakaFee === null || outsideDhakaFee === null || freeShippingThreshold === null || freeShippingThreshold <= 0) {
      return res.status(503).json({ error: 'Shipping configuration is incomplete. No order was created.' });
    }
    const idempotencyKey = getHeader(req, 'idempotency-key');
    if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      return res.status(400).json({ error: 'A valid Idempotency-Key header is required.' });
    }
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid checkout data.', details: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) });
    }
    const merged = new Map<string, number>();
    for (const item of parsed.data.items) merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
    if ([...merged.values()].some(quantity => quantity > 20)) {
      return res.status(400).json({ error: 'Maximum quantity per product is 20.' });
    }
    const items = [...merged].map(([productId, quantity]) => ({ productId, quantity }));
    const { data, error } = await admin.rpc('create_customer_order', {
      p_user_id: user.id,
      p_idempotency_key: idempotencyKey,
      p_customer: parsed.data.customer,
      p_items: items,
      p_dhaka_fee: dhakaFee,
      p_outside_dhaka_fee: outsideDhakaFee,
      p_free_shipping_threshold: freeShippingThreshold,
    });
    if (error) {
      const safeMessage = /Insufficient stock|unavailable|Invalid quantity|Invalid order|Invalid customer|Invalid shipping/i.test(error.message)
        ? error.message : 'Order could not be created. Please retry safely.';
      return res.status(409).json({ error: safeMessage });
    }
    return res.status(201).json({ order: data });
  } catch {
    return res.status(500).json({ error: 'Unexpected order service error. No success is implied; check order status before retrying.' });
  }
}
