import { createHash } from 'node:crypto';
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

  // Claim this OAuth state atomically before exchanging the one-time Meta code.
  // Parallel/replayed callbacks with the same state must not reach Meta's token endpoint.
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const stateHash = createHash('sha256').update(state).digest('hex');
    const { data: claimed, error: claimError } = await admin.rpc('claim_social_oauth_state', { p_state_hash: stateHash });
    if (claimError) {
      console.error('[social-meta-oauth] state_claim_failed', { code: claimError.code ?? null });
      return finish(request, 'error', 'Facebook connection could not verify a one-time authorization state. Apply the latest database migration and try again.');
    }
    if (claimed !== true) {
      return finish(request, 'error', 'This Facebook connection attempt was already processed or expired. Start a new connection from Social Studio.');
    }

    const tokenUrl = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
    tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString();
    const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(15000) });
    const tokenPayload = await tokenResponse.json() as { access_token?: string; error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string } };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      console.error('[social-meta-oauth] authorization_code_exchange_failed', { httpStatus: tokenResponse.status, message: tokenPayload.error?.message ?? null, type: tokenPayload.error?.type ?? null, code: tokenPayload.error?.code ?? null, subcode: tokenPayload.error?.error_subcode ?? null, fbtraceId: tokenPayload.error?.fbtrace_id ?? null });
      return finish(request, 'error', 'Facebook OAuth failed at authorization-code exchange. Check Vercel runtime logs for the Meta error details.');
    }
    // Exchange the short-lived user token before requesting Page tokens.
    const exchangeUrl = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
    exchangeUrl.search = new URLSearchParams({
      grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret,
      fb_exchange_token: tokenPayload.access_token,
    }).toString();
    const exchangeResponse = await fetch(exchangeUrl, { signal: AbortSignal.timeout(15000) });
    const exchangePayload = await exchangeResponse.json() as { access_token?: string; expires_in?: number; error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string } };
    if (!exchangeResponse.ok || !exchangePayload.access_token) {
      console.error('[social-meta-oauth] long_lived_token_exchange_failed', { httpStatus: exchangeResponse.status, message: (exchangePayload as { error?: { message?: string } }).error?.message ?? null, type: (exchangePayload as { error?: { type?: string } }).error?.type ?? null, code: (exchangePayload as { error?: { code?: number } }).error?.code ?? null, subcode: (exchangePayload as { error?: { error_subcode?: number } }).error?.error_subcode ?? null, fbtraceId: (exchangePayload as { error?: { fbtrace_id?: string } }).error?.fbtrace_id ?? null });
      return finish(request, 'error', 'Facebook OAuth failed at long-lived-token exchange. Check Vercel runtime logs for the Meta error details.');
    }
    const userAccessToken = exchangePayload.access_token;
    const pagesResponse = await fetch('https://graph.facebook.com/v26.0/me/accounts?fields=id,name,access_token,tasks&limit=100', {
      headers: { Authorization: `Bearer ${userAccessToken}` }, signal: AbortSignal.timeout(15000),
    });
    const pagesPayload = await pagesResponse.json() as { data?: Array<{ id: string; name: string; access_token: string; tasks?: string[] }>; error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string } };
    if (!pagesResponse.ok || !Array.isArray(pagesPayload.data)) {
      console.error('[social-meta-oauth] page_listing_failed', { httpStatus: pagesResponse.status, message: pagesPayload.error?.message ?? null, type: pagesPayload.error?.type ?? null, code: pagesPayload.error?.code ?? null, subcode: pagesPayload.error?.error_subcode ?? null, fbtraceId: pagesPayload.error?.fbtrace_id ?? null });
      return finish(request, 'error', 'Facebook OAuth failed at Page listing. Check Vercel runtime logs for the Meta error details.');
    }
    const pages = pagesPayload.data;
    if (pages.length === 0) {
      console.warn('[social-meta-oauth] no_pages_returned', {
        httpStatus: pagesResponse.status,
        hint: 'Meta returned an empty data array; verify the authorizing Facebook user has Page access and the requested permissions are granted.',
      });
      return finish(request, 'error', 'Facebook returned no Pages for this account. Make sure you have Facebook Page access, grant pages_show_list and pages_manage_posts permissions, then reconnect.');
    }

    // Fail fast with a specific server-side diagnostic if encryption is misconfigured.
    // Do not log key material, access tokens, or Page credentials.
    try {
      encryptSocialToken('encryption-key-health-check');
    } catch (encryptionError) {
      console.error('[social-meta-oauth] token_encryption_configuration_failed', {
        message: encryptionError instanceof Error ? encryptionError.message : 'Unknown encryption configuration error',
      });
      return finish(request, 'error', 'Facebook Pages were found, but secure token encryption is not configured correctly. Set SOCIAL_TOKEN_ENCRYPTION_KEY in Vercel Production and redeploy.');
    }

    let saved = 0;
    let eligible = 0;
    let failed = 0;
    for (const page of pages) {
      if (!page.id || !page.name || !page.access_token) continue;
      // Only persist Pages for which the authorizing user can create content.
      if (Array.isArray(page.tasks) && page.tasks.length > 0 && !page.tasks.some((task) => ['CREATE_CONTENT', 'MANAGE'].includes(task))) continue;
      eligible++;
      const { error } = await admin.from('social_accounts').upsert({
        provider: 'FACEBOOK_PAGE', provider_account_id: page.id, account_name: page.name,
        access_token_ciphertext: encryptSocialToken(page.access_token), token_expires_at: null,
        status: 'CONNECTED', metadata: { tasks: page.tasks || [] }, updated_at: new Date().toISOString(),
      }, { onConflict: 'provider,provider_account_id' });
      if (error) {
        failed++;
        console.error('[social-meta-oauth] page_save_failed', {
          databaseCode: error.code ?? null,
          databaseMessage: error.message ?? null,
          databaseDetails: error.details ?? null,
          databaseHint: error.hint ?? null,
        });
      } else {
        saved++;
      }
    }

    if (!saved && eligible === 0) {
      console.warn('[social-meta-oauth] no_publishable_pages', {
        pagesReturned: pages.length,
        pagesSkipped: pages.length,
        reason: 'No returned Page had a usable token and/or CREATE_CONTENT or MANAGE task.',
      });
      return finish(request, 'error', 'Facebook returned Pages, but none has the required publishing access. Give your Facebook account Page task access to create content or manage the Page, then reconnect.');
    }
    if (!saved) {
      console.error('[social-meta-oauth] all_page_saves_failed', { pagesReturned: pages.length, eligiblePages: eligible, failedSaves: failed });
      return finish(request, 'error', 'Facebook Pages were found, but the database could not save them. Check the Vercel log event social-meta-oauth page_save_failed and confirm the latest social database migration is applied.');
    }
    if (failed > 0) {
      console.warn('[social-meta-oauth] partial_page_save', { pagesReturned: pages.length, savedPages: saved, failedSaves: failed });
    }
    return finish(request, 'success', `${saved} Facebook Page(s) connected. Return to Social Studio to choose a Page.`);
  } catch (error) {
    console.error('[social-meta-oauth] callback_unhandled_error', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown server or network error',
    });
    return finish(request, 'error', 'Facebook connection failed due to a server error. Check Vercel logs for social-meta-oauth callback_unhandled_error.');
  }
}
