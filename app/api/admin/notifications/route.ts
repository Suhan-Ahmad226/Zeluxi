import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

async function getAdminClient(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || token === authorization) return { error: jsonError('Sign in is required.', 401) };

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return { error: jsonError('Notification service is not configured.', 503) };

  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return { error: jsonError('Invalid or expired session.', 401) };

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
  if (profileError) return { error: jsonError('Administrator role could not be verified.', 503) };
  if (profile?.role !== 'ADMIN') return { error: jsonError('Administrator access is required.', 403) };
  return { admin };
}

export async function GET(request: NextRequest) {
  try {
    const access = await getAdminClient(request);
    if ('error' in access) return access.error;
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 50;
    const admin = access.admin;
    const [itemsResult, unreadResult] = await Promise.all([
      admin.from('admin_notifications')
        .select('id,type,severity,title,message,entity_type,entity_id,metadata,created_at,read_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      admin.from('admin_notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    ]);
    if (itemsResult.error || unreadResult.error) {
      return jsonError('Notifications could not be loaded. Apply the admin notifications database migration and retry.', 503);
    }
    return NextResponse.json(
      { notifications: itemsResult.data || [], unreadCount: unreadResult.count || 0 },
      { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch {
    return jsonError('Unexpected notification service error.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await getAdminClient(request);
    if ('error' in access) return access.error;
    const body = await request.json().catch(() => null) as { action?: unknown; id?: unknown } | null;
    const action = body?.action;
    const id = body?.id;
    const allowedActions = ['mark_read', 'mark_unread', 'mark_all_read'];
    if (!body || typeof action !== 'string' || !allowedActions.includes(action)) {
      return jsonError('Invalid notification action.', 400);
    }
    if (action !== 'mark_all_read' && (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      return jsonError('A valid notification ID is required.', 400);
    }
    const admin = access.admin;
    const update = action === 'mark_unread' ? { read_at: null } : { read_at: new Date().toISOString() };
    let query = admin.from('admin_notifications').update(update);
    if (action === 'mark_all_read') {
      query = query.is('read_at', null);
    } else {
      query = query.eq('id', id as string);
    }
    const { data, error } = await query.select('id,read_at');
    if (error) return jsonError('Notification state could not be updated.', 503);
    if (action !== 'mark_all_read' && (!data || data.length === 0)) return jsonError('Notification not found.', 404);

    const { count, error: countError } = await admin.from('admin_notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    if (countError) return jsonError('Notification was updated but unread count could not be refreshed.', 503);
    return NextResponse.json({ success: true, unreadCount: count || 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Unexpected notification service error.', 500);
  }
}
