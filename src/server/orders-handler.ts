type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; query?: Record<string, string | string[] | undefined> };
type ApiResponse = { setHeader(name: string, value: string): void; status(code: number): ApiResponse; json(payload: unknown): void };
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { bookPathaoOrderFromDatabase, PathaoBookingError } from '../lib/shipping/pathao-booking';
import { formatOrderNumber } from '../lib/orders/order-number';
import { formatCourierAddress, isValidAddressSelection } from '../lib/address/bangladesh-locations';
import { quotePathaoCheckout } from '../lib/shipping/pathao-checkout';
import { PathaoApiError } from '../lib/shipping/pathao-server';

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(?:\+?88)?01[3-9]\d{8}$/),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  division: z.enum(['Dhaka','Chattogram','Rajshahi','Sylhet','Khulna','Barishal','Rangpur','Mymensingh']),
  district: z.string().trim().min(1).max(100),
  upazila: z.string().trim().min(1).max(100).optional(),
  // Accept the former field during rolling deploys and for legacy clients.
  thanaCity: z.string().trim().min(1).max(100).optional(),
  addressDetails: z.string().trim().min(5).max(1000),
  postalCode: z.string().trim().max(20).optional(),
  pathaoCityId: z.number().int().positive().optional(),
  pathaoCityName: z.string().trim().max(100).optional(),
  pathaoZoneId: z.number().int().positive().optional(),
  pathaoZoneName: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
}).refine((address) => Boolean(address.upazila || address.thanaCity), {
  message: 'Upazila / Thana is required',
  path: ['upazila'],
}).superRefine((address, ctx) => {
  // Validate new hierarchical addresses, while allowing legacy thanaCity records during rollout.
  if (address.upazila && !isValidAddressSelection(address.division, address.district, address.upazila)) {
    ctx.addIssue({ code: 'custom', path: ['upazila'], message: 'District and upazila / thana must match the selected division.' });
  }
  if (formatCourierAddress(address).length > 220) {
    ctx.addIssue({ code: 'custom', path: ['addressDetails'], message: 'Delivery address exceeds the courier address limit.' });
  }
});
const checkoutSchema = z.object({
  customer: addressSchema,
  paymentMethod: z.literal('COD'),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(100),
    variantId: z.string().trim().min(1).max(100).optional(),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(50),
  couponCode: z.string().trim().min(3).max(20).optional(),
}).strict();
const statusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PENDING','CONFIRMED','PROCESSING','READY_TO_SHIP','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED']),
}).strict();
const customerOrderActionSchema = z.object({
  action: z.enum(['CANCEL', 'RETURN']),
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
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
      let orderQuery = admin.from('store_orders').select('*, store_order_items(*), courier_shipments(*)').order('created_at', { ascending: false }).limit(500);
      if (scope === 'mine' || !isAdmin) orderQuery = orderQuery.eq('user_id', user.id);
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
          orderNumber: formatOrderNumber(row.order_number),
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
          codFee: Number(row.cod_fee || 0),
          couponCode: row.coupon_code || undefined,
          pathaoDeliveryFee: row.pathao_delivery_fee == null ? undefined : Number(row.pathao_delivery_fee),
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
      const isAdmin = String(user.app_metadata?.role || '').toUpperCase() === 'ADMIN';
      if (!isAdmin) {
        const customerAction = customerOrderActionSchema.safeParse(req.body);
        if (!customerAction.success) {
          return res.status(400).json({ error: 'Invalid customer order request.' });
        }

        const { orderId, action, reason } = customerAction.data;
        const { data: ownedOrder, error: ownedOrderError } = await admin.from('store_orders')
          .select('id,status,delivered_at')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (ownedOrderError) return res.status(503).json({ error: 'Order could not be verified.' });
        if (!ownedOrder) return res.status(404).json({ error: 'Order not found.' });

        let nextStatus: 'CANCELLED' | 'RETURN_REQUESTED';
        let update: Record<string, string>;
        if (action === 'CANCEL') {
          if (!['PENDING', 'CONFIRMED'].includes(String(ownedOrder.status))) {
            return res.status(409).json({ error: 'This order can no longer be cancelled online.' });
          }
          const { data: shipment, error: shipmentError } = await admin.from('courier_shipments')
            .select('status,consignment_id').eq('order_id', orderId).maybeSingle();
          if (shipmentError) return res.status(503).json({ error: 'Courier status could not be checked before cancellation.' });
          if (shipment?.consignment_id || ['BOOKING', 'UNKNOWN', 'BULK_SUBMITTED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED'].includes(String(shipment?.status || ''))) {
            return res.status(409).json({ error: 'This order has a Pathao booking or unresolved booking attempt and cannot be cancelled online.', code: 'PATHAO_CANCELLATION_UNAVAILABLE' });
          }
          nextStatus = 'CANCELLED';
          update = { status: nextStatus, cancellation_reason: reason };
        } else {
          if (String(ownedOrder.status) !== 'DELIVERED') {
            return res.status(409).json({ error: 'A return can only be requested for a delivered order.' });
          }
          const deliveredAt = Date.parse(String(ownedOrder.delivered_at || ''));
          if (!Number.isFinite(deliveredAt)) {
            return res.status(409).json({ error: 'The delivery date is not available for this order. Please contact support to request a return.' });
          }
          if (Date.now() - deliveredAt > 7 * 24 * 60 * 60 * 1000) {
            return res.status(409).json({ error: 'The 7-day return request window has expired.' });
          }
          nextStatus = 'RETURN_REQUESTED';
          update = { status: nextStatus, return_reason: reason };
        }

        if (action === 'CANCEL') {
          const { data: cancellation, error: cancellationError } = await admin.rpc('cancel_order_and_restore_inventory', {
            p_order_id: orderId,
            p_user_id: user.id,
            p_reason: reason,
          });
          if (cancellationError) {
            const message = String(cancellationError.message || '');
            if (/cannot be cancelled|courier booking|not found/i.test(message)) {
              return res.status(/not found/i.test(message) ? 404 : 409).json({ error: message });
            }
            return res.status(503).json({ error: 'Cancellation could not be saved. Please contact support before retrying.' });
          }
          return res.status(200).json({ order: cancellation });
        }

        const { data: updatedOrder, error: updateError } = await admin.from('store_orders')
          .update(update).eq('id', orderId).eq('user_id', user.id).eq('status', String(ownedOrder.status))
          .select('id,status').maybeSingle();
        if (updateError) {
          return res.status(503).json({ error: 'Order request could not be saved. Please try again.' });
        }
        if (!updatedOrder) {
          return res.status(409).json({ error: 'The order changed while this request was being submitted. Refresh the order and try again.' });
        }
        return res.status(200).json({ order: { id: updatedOrder.id, status: updatedOrder.status } });
      }

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid order status update.' });

      const { data: currentOrder, error: currentOrderError } = await admin.from('store_orders')
        .select('id,status,user_id').eq('id', parsed.data.orderId).maybeSingle();
      if (currentOrderError) return res.status(503).json({ error: 'Current order status could not be verified.' });
      if (!currentOrder) return res.status(404).json({ error: 'Order not found.' });
      const currentStatus = String(currentOrder.status || 'PENDING');
      if (parsed.data.status === 'REFUNDED') {
        return res.status(409).json({
          error: 'Refunds cannot be marked complete until a verified refund workflow is integrated.',
          code: 'REFUND_PROCESSOR_UNAVAILABLE',
        });
      }
      if (parsed.data.status === 'CONFIRMED' && !['PENDING', 'CONFIRMED', 'READY_TO_SHIP'].includes(currentStatus)) {
        return res.status(409).json({ error: `Order cannot be booked from status ${currentStatus}.`, code: 'INVALID_ORDER_TRANSITION' });
      }
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['CANCELLED'],
        CONFIRMED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['READY_TO_SHIP', 'CANCELLED'],
        READY_TO_SHIP: [],
        RETURN_REQUESTED: [],
      };
      if (parsed.data.status !== 'CONFIRMED' &&
        !(allowedTransitions[currentStatus] || []).includes(parsed.data.status)) {
        return res.status(409).json({
          error: `Order cannot transition from ${currentStatus} to ${parsed.data.status}.`,
          code: 'INVALID_ORDER_TRANSITION',
        });
      }

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
        const { data: cancellation, error: cancellationError } = await admin.rpc('cancel_order_and_restore_inventory', {
          p_order_id: parsed.data.orderId,
          p_user_id: String(currentOrder.user_id),
          p_reason: 'Cancelled by administrator',
        });
        if (cancellationError) {
          const message = String(cancellationError.message || '');
          if (/cannot be cancelled|courier booking|not found/i.test(message)) {
            return res.status(/not found/i.test(message) ? 404 : 409).json({ error: message });
          }
          return res.status(503).json({ error: 'Cancellation could not be saved. Please retry after checking the order state.' });
        }
        return res.status(200).json({ order: cancellation });
      }

      const { data, error } = await admin.from('store_orders')
        .update({ status: parsed.data.status })
        .eq('id', parsed.data.orderId)
        .eq('status', currentStatus)
        .select('id,status')
        .maybeSingle();
      if (error || !data) return res.status(404).json({ error: 'Order status could not be updated.' });
      return res.status(200).json({ order: { id: data.id, status: data.status } });
    }

    if (!user.email_confirmed_at) return res.status(401).json({ error: 'A verified account is required.' });
    // Legacy zone rates are retained only for RPC compatibility; customer charges use the live Pathao quote below.
    const dhakaFee = readNonNegativeEnv('SHIPPING_DHAKA_FEE') ?? 0;
    const outsideDhakaFee = readNonNegativeEnv('SHIPPING_OUTSIDE_DHAKA_FEE') ?? 0;
    const freeShippingThreshold = readNonNegativeEnv('FREE_SHIPPING_THRESHOLD') ?? 1;
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

    // Requote on the server from current catalog prices and the Pathao merchant rate plan.
    // Never accept shipping, COD or discount amounts supplied by the browser.
    const quote = await quotePathaoCheckout(admin, {
      district: parsed.data.customer.district,
      upazila: parsed.data.customer.upazila || parsed.data.customer.thanaCity || '',
      items,
    });
    const { data: settingsRow, error: settingsError } = await admin.from('store_content')
      .select('content_value').eq('content_key', 'settings').maybeSingle();
    if (settingsError) return res.status(503).json({ error: 'Checkout pricing settings could not be loaded.' });
    const savedSettings = settingsRow?.content_value && typeof settingsRow.content_value === 'object'
      ? settingsRow.content_value as Record<string, unknown> : {};
    const configuredFreeThreshold = Number(savedSettings.freeShippingThreshold ?? process.env.FREE_SHIPPING_THRESHOLD ?? 0);
    const configuredCodFee = Number(savedSettings.codFee ?? process.env.COD_FEE ?? 0);
    if (!Number.isFinite(configuredFreeThreshold) || configuredFreeThreshold <= 0 ||
        !Number.isFinite(configuredCodFee) || configuredCodFee < 0 || configuredCodFee > 2000) {
      return res.status(503).json({ error: 'Free-shipping or COD fee settings are invalid. No order was created.' });
    }
    const shippingFee = quote.subtotal >= configuredFreeThreshold ? 0 : quote.pathaoFee;
    const customerSnapshot = {
      ...parsed.data.customer,
      pathaoCityId: quote.cityId,
      pathaoCityName: quote.cityName,
      pathaoZoneId: quote.zoneId,
      pathaoZoneName: quote.zoneName,
    };

    // Fail closed before creating an order if the public order-number migration is pending.
    const { error: orderNumberSchemaError } = await admin
      .from('store_orders')
      .select('order_number')
      .limit(0);
    if (orderNumberSchemaError) {
      return res.status(503).json({
        error: 'Checkout is temporarily unavailable while the order-number database migration is pending. Please try again later.',
        code: 'ORDER_NUMBER_SCHEMA_NOT_READY',
      });
    }

    // Fail closed until the variant snapshot migration is applied. The previous
    // RPC does not understand variant IDs and could otherwise charge base price
    // or decrement the wrong stock while silently dropping the chosen option.
    const { error: variantSchemaError } = await admin
      .from('store_order_items')
      .select('variant_id,variant_label,variant_sku,variant_attributes,image_url,product_sku,product_brand,product_description,product_barcode,product_specifications')
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
      p_customer: customerSnapshot,
      p_items: items,
      p_dhaka_fee: dhakaFee,
      p_outside_dhaka_fee: outsideDhakaFee,
      p_free_shipping_threshold: freeShippingThreshold,
      p_expected_subtotal: quote.subtotal,
      p_shipping_fee: shippingFee,
      p_pathao_fee: quote.pathaoFee,
      p_cod_fee: configuredCodFee,
      p_cod_percentage: quote.codPercentage,
      p_coupon_code: parsed.data.couponCode || null,
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
      .select('id,order_number,status,customer,subtotal,shipping_fee,cod_fee,discount,coupon_code,pathao_delivery_fee,grand_total,created_at,store_order_items(*)')
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
        orderNumber: formatOrderNumber(savedOrder.order_number),
        status: savedOrder.status,
        createdAt: savedOrder.created_at,
        customer: savedOrder.customer,
        subtotal: Number(savedOrder.subtotal),
        shippingFee: Number(savedOrder.shipping_fee),
        codFee: Number(savedOrder.cod_fee || 0),
        discount: Number(savedOrder.discount || 0),
        couponCode: savedOrder.coupon_code || undefined,
        pathaoDeliveryFee: savedOrder.pathao_delivery_fee == null ? undefined : Number(savedOrder.pathao_delivery_fee),
        grandTotal: Number(savedOrder.grand_total),
        items: savedItems,
        replayed: Boolean(data?.replayed),
      },
    });
  } catch (error) {
    if (error instanceof PathaoApiError) {
      return res.status(error.status || 502).json({ error: error.message, code: error.safeCode });
    }
    return res.status(500).json({ error: 'Unexpected order service error. No success is implied; check order status before retrying.' });
  }
}
