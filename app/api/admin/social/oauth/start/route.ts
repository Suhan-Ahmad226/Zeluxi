import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireSocialAdmin, socialError, noStoreHeaders } from '@/src/lib/social/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const access = await requireSocialAdmin(request);
  if ('response' in access) return access.response;
  const appId = process.env.SOCIAL_META_APP_ID;
  const redirectUri = process.env.SOCIAL_META_REDIRECT_URI;
  if (!appId || !redirectUri) return socialError('Meta OAuth is not configured. Add SOCIAL_META_APP_ID and SOCIAL_META_REDIRECT_URI.', 503);

  const state = randomBytes(24).toString('base64url');
  const stateHash = createHash('sha256').update(state).digest('hex');
  const { error: stateError } = await access.admin.from('social_oauth_states').insert({
    state_hash: stateHash,
    user_id: access.userId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (stateError) {
    console.error('[social-meta-oauth] state_creation_failed', { code: stateError.code ?? null });
    return socialError('Could not start Facebook connection securely. Apply the latest database migration and try again.', 503);
  }

  const response = NextResponse.json({
    url: `https://www.facebook.com/v26.0/dialog/oauth?${new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
    }).toString()}`,
  }, { headers: noStoreHeaders });
  response.cookies.set('zeluxi_social_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/admin/social/oauth/callback', maxAge: 600,
  });
  return response;
}
