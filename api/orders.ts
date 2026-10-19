type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; query?: Record<string, string | string[] | undefined> };
type ApiResponse = { setHeader(name: string, value: string): void; status(code: number): ApiResponse; json(payload: unknown): void };
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { bookPathaoOrderFromDatabase, PathaoBookingError } from '../src/lib/shipping/pathao-booking';

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  division: z.enum(['Dhaka','Chattogram','Rajshahi','Sylhet','Khulna','Barishal','Rangpur','Mymensingh']),
  district: z.string().trim().min(1).max(100),
  thanaCity: z.string().trim().min(1).max(100),
  addressDetails: z.string().trim().min(5).max(1000),
  postalCode: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(300).optional(),
});
const checkoutSchema = z.object({
  customer: addressSchema,
  paymentMethod: z.literal('COD'),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(100),
    variantId: z.string().trim().min(1).max(100).optional(),
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
      const isAdmin = String(user.app_metadata?.role || '').toUpperCase() === 'ADMIN';
      const scope = Array.isArray(req.query?.scope) ? req.query?.scope[0] : req.query?.scope;
      if (!isAdmin && scope !== 'mine') return res.status(403).json({ error: 'Administrator access is required.' });
      // Service-role queries bypass RLS, so customer reads must be scoped to the authenticated user.
      let orderQuery = admin.from('store_orders').select('*, store_order_items(*), courier_shipments(*)').order('created_at', { ascending: false }).limit(500);
      if (!isAdmin) orderQuery = orderQuery.eq('user_id', user.id);
      const { data, error } = await orderQuery;
      if (error) return res.status(503).json({ error: 'Orders could not be loaded.' });
      const productIds = Array.from(new Set((data || []).flatMap((row: any) => (row.store_order_items || []).map((item: any) => String(item.product_id || '')).filter(Boolean))));
      const productImageById = new Map<string, string>();
      if (productIds.length) {
        const { data: productRows } = await admin.from('store_products')
          .select('id,image_url,product_data')
          .in('id', productIds);
        for (const productRow of productRows || []) {
          const productData = productRow.product_data && typeof productRow.product_data === 'object' ? productRow.product_data as Record<string, unknown> : {};
          const storedImages = Array.isArray(productData.images) ? productData.images : [];
          const firstStoredImage = storedImages.find((value: unknown) => typeof value === 'string' && value.trim()) as string | undefined;
          const image = firstStoredImage?.trim() || (typeof productRow.image_url === 'string' ? productRow.image_url.trim() : '');
          if (image) productImageById.set(String(productRow.id), image);
        }
      }
      const orders = (data || []).map((row: any) => {
        const status = row.status || 'PENDING';
        return {
          id: String(row.id),
          createdAt: row.created_at,
          customer: row.customer || {},
          items: (row.store_order_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            variantId: item.variant_id || undefined,
            variantLabel: item.variant_label || undefined,
            variantSku: item.variant_sku || undefined,
            variantAttributes: item.variant_attributes && typeof item.variant_attributes === 'object' ? item.variant_attributes : {},
            productSku: typeof item.product_sku === 'string' ? item.product_sku : undefined,
            brand: typeof item.product_brand === 'string' ? item.product_brand : undefined,
            description: typeof item.product_description === 'string' ? item.product_description : undefined,
            barcode: typeof item.product_barcode === 'string' ? item.product_barcode : undefined,
            specifications: item.product_specifications && typeof item.product_specifications === 'object' && !Array.isArray(item.product_specifications) ? item.product_specifications : {},
            price: Number(item.unit_price),
            quantity: Number(item.quantity),
            image: (typeof item.image_url === 'string' && item.image_url.trim()) || (typeof item.image === 'string' && item.image.trim()) || productImageById.get(String(item.product_id || '')) || '',
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
              bookingStatus: ['BOOKED','IN_TRANSIT','DELIVERED'].includes(status) ? 'BOOKED' : status === 'BOOKING' ? 'BOOKING_IN_PROGRESS' : ['UNKNOWN','BULK_SUBMITTED'].includes(status) ? 'BOOKING_UNKNOWN' : status === 'FAILED' ? 'BOOKING_FAILED' : 'NOT_BOOKED',
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

      // Accepting an order is a courier operation: do not mark it accepted unless
      // Pathao confirms the booking. The dedicated Admin > Delivery & Tracking
      // action uses this same idempotent booking service.
      if (parsed.data.status === 'CONFIRMED') {
        try {
          const shipment = await bookPathaoOrderFromDatabase(parsed.data.orderId);
          return res.status(200).json({
            order: { id: parsed.data.orderId, status: 'SHIPPED' },
            courier: { provider: 'PATHAO', consignmentId: shipment.consignmentId, bookingStatus: 'BOOKED', deliveryFee: shipment.deliveryFee },
            message: shipment.alreadyBooked ? 'Existing Pathao booking confirmed.' : 'Order accepted and booked with Pathao.',
          });
        } catch (bookingError) {
          if (bookingError instanceof PathaoBookingError) {
            return res.status(bookingError.httpStatus).json({ error: bookingError.message, code: bookingError.safeCode });
          }
          return res.status(502).json({ error: 'Pathao booking could not be confirmed. Check the courier shipment state before retrying.' });
        }
      }

      if (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'].includes(parsed.data.status)) {
        return res.status(409).json({
          error: 'Courier-managed status must be synchronized from Pathao. Manual status changes are blocked to keep tracking accurate.',
          code: 'COURIER_STATUS_SYNC_REQUIRED',
        });
      }
      if (parsed.data.status === 'CANCELLED') {
        const { data: shipment, error: shipmentError } = await admin.from('courier_shipments')
          .select('status,consignment_id').eq('order_id', parsed.data.orderId).maybeSingle();
        if (shipmentError) return res.status(503).json({ error: 'Courier status could not be checked before cancellation.' });
        if (shipment?.consignment_id || ['BOOKING', 'UNKNOWN', 'BULK_SUBMITTED'].includes(String(shipment?.status || ''))) {
          return res.status(409).json({
            error: 'This order has a Pathao booking or unresolved booking attempt. The supplied Pathao API specification has no cancellation endpoint, so it cannot be safely cancelled here.',
            code: 'PATHAO_CANCELLATION_UNAVAILABLE',
          });
        }
      }

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
    const merged = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of parsed.data.items) {
      const variantId = item.variantId || undefined;
      const key = item.productId + '::' + (variantId || 'default');
      const current = merged.get(key);
      merged.set(key, { productId: item.productId, variantId, quantity: (current?.quantity || 0) + item.quantity });
    }
    if ([...merged.values()].some(item => item.quantity > 20)) {
      return res.status(400).json({ error: 'Maximum quantity per product variant is 20.' });
    }
    const items = [...merged.values()];

    // Fail closed until the variant snapshot migration is applied. The previous
    // RPC does not understand variant IDs and could otherwise charge base price
    // or decrement the wrong stock while silently dropping the chosen option.
    const { error: variantSchemaError } = await admin
      .from('store_order_items')
      .select('variant_id,variant_label,variant_sku,variant_attributes,image_url')
      .limit(0);
    if (variantSchemaError) {
      return res.status(503).json({
        error: 'Checkout is temporarily unavailable while the variant and invoice database migration is pending. Please try again later.',
        code: 'VARIANT_ORDER_SCHEMA_NOT_READY',
      });
    }

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
      const safeMessage = /Insufficient stock|unavailable|Invalid quantity|Invalid order|Invalid customer|Invalid shipping|select a product variant/i.test(error.message)
        ? error.message : 'Order could not be created. Please retry safely.';
      return res.status(409).json({ error: safeMessage });
    }

    // Return the committed database snapshot, never the browser's claimed price or variant label.
    const orderId = String(data?.orderId || '');
    const { data: savedOrder, error: savedOrderError } = await admin
      .from('store_orders')
      .select('id,status,customer,subtotal,shipping_fee,discount,grand_total,created_at,store_order_items(*)')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();
    if (savedOrderError || !savedOrder) {
      return res.status(503).json({ error: 'Order was submitted but its invoice snapshot could not be loaded. Retry with the same checkout session or check order history.' });
    }

    const savedItems = (savedOrder.store_order_items || []).map((item: any) => ({
      productId: String(item.product_id),
      productName: String(item.product_name),
      variantId: item.variant_id ? String(item.variant_id) : undefined,
      variantLabel: item.variant_label ? String(item.variant_label) : undefined,
      variantSku: item.variant_sku ? String(item.variant_sku) : undefined,
      variantAttributes: item.variant_attributes && typeof item.variant_attributes === 'object' ? item.variant_attributes : {},
      price: Number(item.unit_price),
      quantity: Number(item.quantity),
      image: typeof item.image_url === 'string' ? item.image_url : '',
    }));
    return res.status(201).json({
      order: {
        orderId: savedOrder.id,
        status: savedOrder.status,
        createdAt: savedOrder.created_at,
        customer: savedOrder.customer,
        subtotal: Number(savedOrder.subtotal),
        shippingFee: Number(savedOrder.shipping_fee),
        discount: Number(savedOrder.discount || 0),
        grandTotal: Number(savedOrder.grand_total),
        items: savedItems,
        replayed: Boolean(data?.replayed),
      },
    });
  } catch {
    return res.status(500).json({ error: 'Unexpected order service error. No success is implied; check order status before retrying.' });
  }
}
