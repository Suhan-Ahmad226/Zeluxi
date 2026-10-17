import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPES = new Set(['products', 'storefront', 'categories', 'pages', 'settings', 'media']);

function jsonError(message: string, status: number) {
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

  if (!cloudName || !apiKey || !apiSecret) return jsonError('Cloudinary media storage is not configured on the server.', 503);
  if (!supabaseUrl || !anonKey) return jsonError('Authentication is not configured.', 503);

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return jsonError('Administrator authentication is required.', 401);

  const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return jsonError('Your session is invalid or expired.', 401);
  if (String(data.user.app_metadata?.role || '').toUpperCase() !== 'ADMIN') {
    return jsonError('Administrator access is required.', 403);
  }

  let body: { scope?: unknown; ownerId?: unknown; resourceType?: unknown };
  try { body = await request.json(); } catch { return jsonError('A valid JSON body is required.', 400); }

  const scope = typeof body.scope === 'string' ? body.scope : '';
  const ownerId = typeof body.ownerId === 'string' ? body.ownerId : '';
  const resourceType = body.resourceType === 'video' ? 'video' : body.resourceType === 'image' ? 'image' : '';
  if (!SCOPES.has(scope) || !/^[a-zA-Z0-9_-]{1,100}$/.test(ownerId) || !resourceType) {
    return jsonError('A valid media scope, owner ID, and resource type are required.', 400);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `zelux/${scope}/${ownerId}`;
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature, resourceType }, {
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
