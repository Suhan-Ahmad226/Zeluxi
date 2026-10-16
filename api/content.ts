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

function header(req: ApiRequest, name: string): string {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
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
      if (error) return res.status(503).json({ error: 'Saved storefront content could not be loaded.' });
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
    const serialized = JSON.stringify(body.value);
    if (!serialized || serialized.length > 2_500_000) {
      return res.status(413).json({ error: 'Content is too large to save. Use hosted image URLs instead of embedded image data.' });
    }
    const { error } = await db.from('store_content').upsert({
      content_key: body.key,
      content_value: body.value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'content_key' });
    if (error) return res.status(503).json({ error: 'Content could not be saved to the database.' });
    return res.status(200).json({ saved: true, key: body.key });
  } catch {
    return res.status(500).json({ error: 'Content request failed unexpectedly.' });
  }
}
