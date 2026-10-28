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
  // Drafts may be saved before category selection; publishing is checked below.
  category: z.string().trim().max(100),
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
  imagePublicIds: z.array(z.string().max(255)).max(20).optional(),
  videoUrl: z.string().url().max(2048).optional(),
  videoPublicId: z.string().max(255).optional(),
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
}).strict().superRefine((product, ctx) => {
  if (!product.name.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Product name is required.' });
  }
  if (product.published) {
    if (!product.category.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category'], message: 'Choose a category before publishing.' });
    }
    if (product.price <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'Selling price must be greater than zero before publishing.' });
    }
    if (product.images.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: 'Add at least one product image before publishing.' });
    }
  }
});

function getHeader(req: ApiRequest, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function resolveProductImages(stored: Record<string, unknown>, imageUrl: unknown): string[] {
  const storedImages = Array.isArray(stored.images)
    ? stored.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0).map((image) => image.trim())
    : [];
  if (storedImages.length) return storedImages;
  return typeof imageUrl === 'string' && imageUrl.trim() ? [imageUrl.trim()] : [];
}

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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
      const token = getHeader(req, 'authorization').replace(/^Bearer\s+/i, '');
      // Anonymous catalog responses contain only published, sanitized product data.
      // Let the Vercel edge reuse them briefly; authenticated requests remain no-store.
      if (!token) res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      if (token && serviceRoleKey) {
        const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: authData } = await authClient.auth.getUser(token);
        if (String(authData.user?.app_metadata?.role || '').toUpperCase() === 'ADMIN') {
          const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data: adminRows, error: adminError } = await adminClient.from('store_products')
            .select('id,name,sku,price,cost_price,stock,published,archived,image_url,product_data,updated_at')
            .order('updated_at', { ascending: false });
          if (adminError) return res.status(503).json({ error: 'Administrator catalog could not be loaded.' });
          const products = (adminRows || []).map((row) => {
            const stored = row.product_data && typeof row.product_data === 'object'
              ? row.product_data as Record<string, unknown>
              : {};
            return {
              ...stored,
              id: row.id,
              name: row.name,
              sku: row.sku || stored.sku || '',
              price: Number(row.price),
              costPrice: row.cost_price == null ? undefined : Number(row.cost_price),
              stock: row.stock,
              published: row.published,
              archived: row.archived,
              images: resolveProductImages(stored, row.image_url),
            };
          });
          return res.status(200).json({ products });
        }
      }
      const publicClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const requestedSlug = typeof req.query?.slug === 'string' ? req.query.slug.trim() : Array.isArray(req.query?.slug) ? req.query.slug[0] : '';
      const requestedId = typeof req.query?.id === 'string' ? req.query.id.trim() : Array.isArray(req.query?.id) ? req.query.id[0] : '';

      if (requestedSlug || requestedId) {
        let singleQuery = publicClient
          .from('store_products')
          .select('id,name,price,stock,published,archived,image_url,product_data,updated_at')
          .eq('published', true)
          .eq('archived', false);

        if (requestedId) {
          singleQuery = singleQuery.eq('id', requestedId);
        } else if (requestedSlug) {
          singleQuery = singleQuery.eq('product_data->>slug', requestedSlug);
        }

        const { data: singleData, error: singleError } = await singleQuery.limit(1);
        if (singleError || !singleData || singleData.length === 0) {
          if (requestedSlug) {
            const fallback = await publicClient
              .from('store_products')
              .select('id,name,price,stock,published,archived,image_url,product_data,updated_at')
              .eq('published', true)
              .eq('archived', false)
              .eq('id', requestedSlug)
              .limit(1);
            if (fallback.data && fallback.data.length > 0) {
              const row = fallback.data[0];
              const stored = row.product_data && typeof row.product_data === 'object' ? (row.product_data as Record<string, unknown>) : {};
              const { costPrice: _costPrice, ...publicData } = stored;
              const product = {
                ...publicData,
                id: row.id,
                name: row.name,
                price: Number(row.price),
                stock: row.stock,
                published: row.published,
                archived: row.archived,
                images: resolveProductImages(stored, row.image_url),
              };
              return res.status(200).json({ product });
            }
          }
          return res.status(404).json({ error: 'Product not found.' });
        }

        const row = singleData[0];
        const stored = row.product_data && typeof row.product_data === 'object' ? (row.product_data as Record<string, unknown>) : {};
        const { costPrice: _costPrice, ...publicData } = stored;
        const product = {
          ...publicData,
          id: row.id,
          name: row.name,
          price: Number(row.price),
          stock: row.stock,
          published: row.published,
          archived: row.archived,
          images: resolveProductImages(stored, row.image_url),
        };
        return res.status(200).json({ product });
      }

      const requestedLimit = Number(Array.isArray(req.query?.limit) ? req.query?.limit[0] : req.query?.limit);
      const requestedOffset = Number(Array.isArray(req.query?.offset) ? req.query?.offset[0] : req.query?.offset);
      const limit = Number.isFinite(requestedLimit) ? Math.min(48, Math.max(1, Math.floor(requestedLimit))) : 12;
      const offset = Number.isFinite(requestedOffset) ? Math.min(1000000, Math.max(0, Math.floor(requestedOffset))) : 0;
      const { data, error, count } = await publicClient
        .from('store_products')
        .select('id,name,price,stock,published,archived,image_url,product_data,updated_at', { count: 'exact' })
        .eq('published', true)
        .eq('archived', false)
        // Keep featured items in the initial catalog page so the homepage can render its featured section.
        .order('product_data->featured', { ascending: false })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) return res.status(503).json({ error: 'Unable to load catalog.' });
      const products = (data || []).map((row) => {
        const stored = row.product_data && typeof row.product_data === 'object'
          ? row.product_data as Record<string, unknown>
          : {};
        // Never expose internal procurement cost data through the public catalog API.
        const { costPrice: _costPrice, ...publicData } = stored;
        return {
          ...publicData,
          id: row.id,
          name: row.name,
          price: Number(row.price),
          stock: row.stock,
          published: row.published,
          archived: row.archived,
          images: resolveProductImages(stored, row.image_url),
        };
      });
      const total = count ?? offset + products.length;
      return res.status(200).json({ products, pagination: { limit, offset, total, hasMore: offset + products.length < total, nextOffset: offset + products.length } });
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
      const { data: archivedRow, error } = await admin.from('store_products')
        .update({ published: false, archived: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) return res.status(503).json({ error: 'Product could not be archived.' });
      if (!archivedRow) return res.status(404).json({ error: 'Product not found or already removed.' });
      return res.status(200).json({ archived: true, id: archivedRow.id });
    }

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid product payload.',
        details: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      });
    }
    const product = parsed.data;
    const { data: existing, error: existingError } = await admin
      .from('store_products').select('id').eq('id', product.id).maybeSingle();
    if (existingError) return res.status(503).json({ error: 'Product state could not be checked.' });
    if (req.method === 'POST' && existing) return res.status(409).json({ error: 'Product ID already exists.' });
    if (req.method === 'PATCH' && !existing) return res.status(404).json({ error: 'Product not found.' });

    // Enforce case-insensitive SKU uniqueness at the API boundary too. UI-only
    // duplicate guards are insufficient when two tabs or admins save at once.
    const { data: skuRows, error: skuError } = await admin
      .from('store_products').select('id,sku');
    if (skuError) return res.status(503).json({ error: 'Product SKU uniqueness could not be checked.' });
    const normalizedSku = product.sku.trim().toLocaleLowerCase('en-US');
    const skuConflict = (skuRows || []).some((row) =>
      row.id !== product.id && String(row.sku || '').trim().toLocaleLowerCase('en-US') === normalizedSku
    );
    if (skuConflict) return res.status(409).json({ error: 'This SKU is already used by another product.' });
    const { costPrice, ...publicProductData } = product;
    const row = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost_price: costPrice ?? null,
      stock: product.stock,
      published: product.published,
      archived: product.archived ?? false,
      image_url: product.images[0] ?? null,
      // Never store procurement cost in the JSON exposed to public catalog reads.
      product_data: publicProductData,
      updated_at: new Date().toISOString(),
    };
    const write = req.method === 'POST'
      ? await admin.from('store_products').insert(row)
      : await admin.from('store_products').update(row).eq('id', product.id);
    if (write.error) return res.status(409).json({ error: 'Product could not be saved. Check SKU and database constraints.' });
    return res.status(req.method === 'POST' ? 201 : 200).json({ product });
  } catch {
    return res.status(500).json({ error: 'Catalog request failed unexpectedly.' });
  }
}
