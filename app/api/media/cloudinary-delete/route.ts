import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function POST(request: NextRequest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!cloudName || !apiKey || !apiSecret) return fail('Cloudinary media storage is not configured on the server.', 503);
  if (!supabaseUrl || !anonKey) return fail('Authentication is not configured.', 503);

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return fail('Administrator authentication is required.', 401);
  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return fail('Your session is invalid or expired.', 401);
  if (String(data.user.app_metadata?.role || '').toUpperCase() !== 'ADMIN') return fail('Administrator access is required.', 403);

  let body: { publicId?: unknown; resourceType?: unknown; ownerId?: unknown; scope?: unknown };
  try { body = await request.json(); } catch { return fail('A valid JSON body is required.', 400); }
  const publicId = typeof body.publicId === 'string' ? body.publicId : '';
  const resourceType = body.resourceType === 'video' ? 'video' : body.resourceType === 'image' ? 'image' : '';
  const ownerId = typeof body.ownerId === 'string' ? body.ownerId : '';
  const scope = typeof body.scope === 'string' ? body.scope : '';
  const allowedScopes = new Set(['products', 'storefront', 'categories', 'pages', 'settings', 'media']);
  const expectedPrefix = scope === 'storefront' && ownerId === 'storefront'
    ? 'zelux/storefront/storefront/'
    : `zelux/${scope}/${ownerId}/`;
  // Ensure a cleanup request cannot target another record's managed asset.
  if (!resourceType || !allowedScopes.has(scope) || !/^[a-zA-Z0-9_-]{1,100}$/.test(ownerId) ||
      !/^zelux\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\/-]{1,180}$/.test(publicId) ||
      publicId.includes('..') || !publicId.startsWith(expectedPrefix)) {
    return fail('Only media owned by the specified Zelux record can be deleted.', 400);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const invalidate = 'true';
  const toSign = `invalidate=${invalidate}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');
  const form = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate, api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as { result?: string; error?: { message?: string } } | null;
  if (!response.ok || (result?.result !== 'ok' && result?.result !== 'not found')) {
    return fail(result?.error?.message || 'Cloudinary asset cleanup failed; retry cleanup later.', 502);
  }
  return NextResponse.json({ success: true, result: result.result }, {
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
