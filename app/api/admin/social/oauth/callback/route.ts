import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptSocialToken, noStoreHeaders } from '@/src/lib/social/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function finish(request: NextRequest, status: 'success' | 'error', message: string) {
  let callbackOrigin = request.nextUrl.origin;
  try {
    if (process.env.SOCIAL_META_REDIRECT_URI) callbackOrigin = new URL(process.env.SOCIAL_META_REDIRECT_URI).origin;
  } catch {
    // Fall back to the verified request origin if the configured callback URI is malformed.
  }
  const origin = callbackOrigin.replace(/\/$/, '');
  const response = NextResponse.redirect(new URL(`/admin?socialConnection=${status}&message=${encodeURIComponent(message)}`, origin));
  response.cookies.set('zeluxi_social_oauth_state', '', { path: '/api/admin/social/oauth/callback', maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  response.headers.set('Cache-Control', noStoreHeaders['Cache-Control']);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get('zeluxi_social_oauth_state')?.value;
  const oauthError = request.nextUrl.searchParams.get('error_description') || request.nextUrl.searchParams.get('error');
  if (oauthError) return finish(request, 'error', 'Facebook authorization was cancelled or denied.');
  if (!code || !state || !expectedState || state !== expectedState) return finish(request, 'error', 'Facebook authorization state could not be verified.');
  const appId = process.env.SOCIAL_META_APP_ID;
  const appSecret = process.env.SOCIAL_META_APP_SECRET;
  const redirectUri = process.env.SOCIAL_META_REDIRECT_URI;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!appId || !appSecret || !redirectUri || !url || !service) return finish(request, 'error', 'Meta OAuth or Supabase server configuration is incomplete.');
  try {
    const tokenUrl = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
    tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString();
    const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(15000) });
    const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: { message?: string } };
    if (!tokenResponse.ok || !tokenPayload.access_token) return finish(request, 'error', 'Facebook could not issue an access token. Check Meta app settings.');
    // Exchange the short-lived user token before requesting Page tokens.
    const exchangeUrl = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
    exchangeUrl.search = new URLSearchParams({
      grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret,
      fb_exchange_token: tokenPayload.access_token,
    }).toString();
    const exchangeResponse = await fetch(exchangeUrl, { signal: AbortSignal.timeout(15000) });
    const exchangePayload = await exchangeResponse.json() as { access_token?: string; expires_in?: number };
    if (!exchangeResponse.ok || !exchangePayload.access_token) return finish(request, 'error', 'Facebook could not exchange a long-lived user token. Check Meta app configuration and permissions.');
    const userAccessToken = exchangePayload.access_token;
    const pagesResponse = await fetch('https://graph.facebook.com/v26.0/me/accounts?fields=id,name,access_token,tasks&limit=100', {
      headers: { Authorization: `Bearer ${userAccessToken}` }, signal: AbortSignal.timeout(15000),
    });
    const pagesPayload = await pagesResponse.json() as { data?: Array<{ id: string; name: string; access_token: string; tasks?: string[] }>; error?: { message?: string } };
    if (!pagesResponse.ok || !Array.isArray(pagesPayload.data)) return finish(request, 'error', 'No Pages were returned. Verify Page access and Meta permissions.');
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    let saved = 0;
    for (const page of pagesPayload.data) {
      if (!page.id || !page.name || !page.access_token) continue;
      // Only persist Pages for which the authorizing user can create content.
      if (Array.isArray(page.tasks) && page.tasks.length > 0 && !page.tasks.some((task) => ['CREATE_CONTENT', 'MANAGE'].includes(task))) continue;
      const { error } = await admin.from('social_accounts').upsert({
        provider: 'FACEBOOK_PAGE', provider_account_id: page.id, account_name: page.name,
        access_token_ciphertext: encryptSocialToken(page.access_token), token_expires_at: null,
        status: 'CONNECTED', metadata: { tasks: page.tasks || [] }, updated_at: new Date().toISOString(),
      }, { onConflict: 'provider,provider_account_id' });
      if (!error) saved++;
    }
    if (!saved) return finish(request, 'error', 'No Facebook Pages could be saved. Apply the social migration and check server encryption settings.');
    return finish(request, 'success', `${saved} Facebook Page(s) connected. Return to Social Studio to choose a Page.`);
  } catch {
    return finish(request, 'error', 'Facebook connection failed due to a server or network error.');
  }
}
