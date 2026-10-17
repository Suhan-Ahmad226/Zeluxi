import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(payload: unknown): void;
};

const PUBLIC_KEYS = new Set(['storefront_cms', 'categories', 'pages', 'settings']);

function isSafeLink(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  const link = value.trim();
  if (!link || [...link].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  if (link.startsWith('/')) return !link.startsWith('//') && !link.includes(String.fromCharCode(92));
  try {
    const parsed = new URL(link);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function validateHeroCMS(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Hero content must be an object.';
  const cms = value as Record<string, unknown>;
  if (!cms.hero || typeof cms.hero !== 'object' || Array.isArray(cms.hero)) return 'Hero content is missing.';
  if (cms.banners === undefined) return null; // Backwards-compatible legacy CMS record.
  if (!Array.isArray(cms.banners)) return 'Hero banners must be an array.';
  if (cms.banners.length > 10) return 'A maximum of 10 hero banners is allowed.';

  const ids = new Set<string>();
  for (const [index, raw] of cms.banners.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return `Banner ${index + 1} is invalid.`;
    const banner = raw as Record<string, unknown>;
    if (typeof banner.id !== 'string' || !banner.id.trim() || banner.id.length > 100 || ids.has(banner.id)) {
      return `Banner ${index + 1} has an invalid or duplicate ID.`;
    }
    ids.add(banner.id);
    if (typeof banner.active !== 'boolean' || !Number.isFinite(banner.order)) {
      return `Banner ${index + 1} has invalid publishing or ordering settings.`;
    }
    if (typeof banner.headline !== 'string' || banner.headline.length > 180 ||
        (banner.active && !banner.headline.trim())) {
      return `Banner ${index + 1} needs a headline of 180 characters or fewer.`;
    }
    for (const field of ['tagline', 'description', 'primaryButtonText', 'secondaryButtonText', 'highlightTitle', 'highlightSubtitle', 'highlightPrice']) {
      if (banner[field] !== undefined && (typeof banner[field] !== 'string' || (banner[field] as string).length > 2000)) {
        return `Banner ${index + 1} has invalid text in ${field}.`;
      }
    }
    for (const field of ['imageUrl', 'mobileImageUrl']) {
      const image = banner[field];
      if (image !== undefined && (typeof image !== 'string' || image.length > 2_000_000 ||
          (image !== '' && !/^https:\/\//i.test(image) && !/^data:image\/(jpeg|png|webp);base64,/i.test(image)))) {
        return `Banner ${index + 1} has an invalid image URL.`;
      }
    }
    for (const field of ['primaryButtonLink', 'secondaryButtonLink']) {
      if (!isSafeLink(banner[field])) return `Banner ${index + 1} has an unsafe button link.`;
    }
  }
  return null;
}

function header(req: ApiRequest, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'PUT'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { url, anon, service } = config();
  if (!url || !anon) return res.status(503).json({ error: 'Content service is not configured.' });

  try {
    const token = header(req, 'authorization').replace(/^Bearer\s+/i, '');
    let isAdmin = false;
    if (token) {
      const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await auth.auth.getUser(token);
      if (!error && data.user) {
        isAdmin = String(data.user.app_metadata?.role || '').toUpperCase() === 'ADMIN';
      }
    }

    if (req.method === 'PUT' && !isAdmin) {
      return res.status(token ? 403 : 401).json({ error: 'Administrator access is required.' });
    }
    if (!service) return res.status(503).json({ error: 'Content database service is not configured.' });

    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    if (req.method === 'GET') {
      const { data, error } = await db.from('store_content').select('content_key,content_value');
      if (error) {
        const missingTable = error.code === '42P01' || error.code === 'PGRST205';
        return res.status(503).json({
          error: missingTable
            ? 'Store content database table is missing. Apply supabase/migrations/20261017000000_store_content.sql to the configured Supabase project.'
            : 'Saved storefront content could not be loaded. Check the Supabase service-role key and database permissions.',
          code: error.code || 'CONTENT_LOAD_FAILED',
        });
      }
      const content: Record<string, unknown> = {};
      for (const row of data || []) {
        if (isAdmin || PUBLIC_KEYS.has(row.content_key)) content[row.content_key] = row.content_value;
      }
      return res.status(200).json({ content });
    }

    const body = req.body as { key?: unknown; value?: unknown } | null;
    if (!body || typeof body.key !== 'string' || !/^(storefront_cms|settings|categories|pages|coupons)$/.test(body.key)) {
      return res.status(400).json({ error: 'A supported content key is required.' });
    }
    if (body.key === 'storefront_cms') {
      const validationError = validateHeroCMS(body.value);
      if (validationError) return res.status(400).json({ error: validationError });
    }
    const serialized = JSON.stringify(body.value);
    if (!serialized || serialized.length > 2_500_000) {
      return res.status(413).json({ error: 'Content is too large to save. Use hosted image URLs instead of embedded image data.' });
    }
    const { error } = await db.from('store_content').upsert({
      content_key: body.key,
      content_value: body.value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'content_key' });
    if (error) {
      const missingTable = error.code === '42P01' || error.code === 'PGRST205';
      return res.status(503).json({
        error: missingTable
          ? 'Store content database table is missing. Apply supabase/migrations/20261017000000_store_content.sql to the configured Supabase project.'
          : 'Content could not be saved to the database. Check the Supabase project URL, service-role key, and store_content table permissions.',
        code: error.code || 'CONTENT_SAVE_FAILED',
      });
    }
    return res.status(200).json({ saved: true, key: body.key });
  } catch {
    return res.status(500).json({ error: 'Content request failed unexpectedly.' });
  }
}
