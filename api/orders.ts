import type { VercelRequest, VercelResponse } from '@vercel/node';
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
const bodySchema = z.object({
  customer: addressSchema,
  paymentMethod: z.literal('COD'),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(50),
  shippingFee: z.number().min(0).max(2000),
}).strict();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(503).json({ error: 'Order service is not configured. No order was created.' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const idempotencyKey = req.headers['idempotency-key'];
  if (!token) return res.status(401).json({ error: 'Sign in is required.' });
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return res.status(400).json({ error: 'A valid Idempotency-Key header is required.' });
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user || !authData.user.email_confirmed_at) {
      return res.status(401).json({ error: 'A verified account is required.' });
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid checkout data.', details: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) });
    }

    // Normalize duplicate product lines before calling the transactional database function.
    const merged = new Map<string, number>();
    for (const item of parsed.data.items) merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
    if ([...merged.values()].some(qty => qty > 20)) return res.status(400).json({ error: 'Maximum quantity per product is 20.' });
    const items = [...merged].map(([productId, quantity]) => ({ productId, quantity }));

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc('create_customer_order', {
      p_user_id: authData.user.id,
      p_idempotency_key: idempotencyKey,
      p_customer: parsed.data.customer,
      p_items: items,
      p_shipping_fee: parsed.data.shippingFee,
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
