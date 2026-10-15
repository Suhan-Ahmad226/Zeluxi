import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(payload: unknown): void;
};

const variantSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(150),
  sku: z.string().max(100),
  price: z.number().finite().nonnegative().max(100000000),
  stock: z.number().int().nonnegative().max(1000000),
  barcode: z.string().max(100).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  attributes: z.record(z.string(), z.string()).default({}),
}).strict();

const productSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sku: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  description: z.string().max(20000),
  shortDescription: z.string().max(500).optional(),
  brand: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  productType: z.enum(['physical', 'digital', 'service']).optional(),
  condition: z.enum(['new', 'refurbished']).optional(),
  price: z.number().finite().nonnegative().max(100000000),
  compareAtPrice: z.number().finite().nonnegative().max(100000000).optional(),
  costPrice: z.number().finite().nonnegative().max(100000000).optional(),
  stock: z.number().int().nonnegative().max(1000000),
  lowStockThreshold: z.number().int().nonnegative().max(1000000),
  images: z.array(z.string().url().max(2048)).max(20),
  videoUrl: z.string().url().max(2048).optional(),
  featured: z.boolean(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isFlashDeal: z.boolean().optional(),
  rating: z.number().finite().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  variants: z.array(variantSchema).max(100),
  specifications: z.record(z.string(), z.string()),
  tags: z.array(z.string().max(80)).max(50),
  published: z.boolean(),
  archived: z.boolean().optional(),
  weightKg: z.number().finite().nonnegative().optional(),
  dimensions: z.string().max(200).optional(),
  shippingClass: z.string().max(100).optional(),
  taxClass: z.string().max(100).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  warrantyPolicy: z.string().max(2000).optional(),
  returnPolicy: z.string().max(2000).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  seoKeywords: z.string().max(500).optional(),
  ogImageUrl: z.string().url().max(2048).optional(),
  canonicalUrl: z.string().url().max(2048).optional(),
  minOrderQuantity: z.number().int().positive().optional(),
  maxOrderQuantity: z.number().int().positive().optional(),
  taxRate: z.number().finite().min(0).max(100).optional(),
}).strict();

function getHeader(req: ApiRequest, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, anonKey, serviceRoleKey };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Authorization');

  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { url, anonKey, serviceRoleKey } = getConfig();
  if (!url || !anonKey) return res.status(503).json({ error: 'Catalog service is not configured.' });

  try {
    if (req.method === 'GET') {
      const publicClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await publicClient
        .from('store_products')
        .select('id,name,price,stock,published,archived,image_url,product_data,updated_at')
        .eq('published', true)
        .eq('archived', false)
        .order('updated_at', { ascending: false });
      if (error) return res.status(503).json({ error: 'Unable to load catalog.' });
      const products = (data || []).map((row) => ({
        ...(row.product_data && typeof row.product_data === 'object' ? row.product_data : {}),
        id: row.id,
        name: row.name,
        price: Number(row.price),
        stock: row.stock,
        published: row.published,
        archived: row.archived,
        images: Array.isArray((row.product_data as Record<string, unknown> | null)?.images)
          ? (row.product_data as { images: unknown[] }).images
          : row.image_url ? [row.image_url] : [],
      }));
      return res.status(200).json({ products });
    }

    if (!serviceRoleKey) return res.status(503).json({ error: 'Catalog administration is not configured.' });
    const authHeader = getHeader(req, 'authorization');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Sign in as an administrator is required.' });

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: 'Invalid or expired session.' });
    if (String(authData.user.app_metadata?.role || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Administrator access is required.' });
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (req.method === 'DELETE') {
      const idValue = req.query?.id;
      const id = Array.isArray(idValue) ? idValue[0] : idValue;
      if (!id || id.length > 100) return res.status(400).json({ error: 'A valid product id is required.' });
      // Archive rather than hard-delete: historical order items reference product IDs.
      const { error } = await admin.from('store_products')
        .update({ published: false, archived: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return res.status(404).json({ error: 'Product could not be archived.' });
      return res.status(200).json({ archived: true, id });
    }

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid product payload.',
        details: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      });
    }
    const product = parsed.data;
    if (req.method === 'PATCH') {
      const { data: existing, error: existingError } = await admin
        .from('store_products').select('id').eq('id', product.id).maybeSingle();
      if (existingError || !existing) return res.status(404).json({ error: 'Product not found.' });
    }

    const row = {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      published: product.published,
      archived: product.archived ?? false,
      image_url: product.images[0] ?? null,
      product_data: product,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from('store_products').upsert(row, { onConflict: 'id' });
    if (error) return res.status(409).json({ error: 'Product could not be saved. Check SKU and database constraints.' });
    return res.status(req.method === 'POST' ? 201 : 200).json({ product });
  } catch {
    return res.status(500).json({ error: 'Catalog request failed unexpectedly.' });
  }
}
