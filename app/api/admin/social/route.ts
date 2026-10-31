import { NextRequest, NextResponse } from 'next/server';
import { publishPost } from '@/src/lib/social/publishing';
import { z } from 'zod';
import { generateProductCaption, noStoreHeaders, productUrl, requireSocialAdmin, socialError } from '@/src/lib/social/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const postSchema = z.object({
  action: z.enum(['generate_caption','create_draft','update_post','schedule_post','publish_now','approve_post','cancel_post','create_promotion','pause_promotion','resume_promotion','disconnect_account']),
  postId: z.string().uuid().optional(),
  promotionId: z.string().uuid().optional(),
  productId: z.string().min(1).max(100).optional(),
  accountId: z.string().uuid().optional(),
  accountIds: z.array(z.string().uuid()).max(20).optional(),
  caption: z.string().max(5000).optional(),
  mediaUrls: z.array(z.string().url().max(2048).refine((value) => value.startsWith('https://'), 'Media URLs must use HTTPS.')).max(10).optional(),
  language: z.enum(['bn','en','mix']).optional(),
  contentGoal: z.enum(['PRODUCT_SHOWCASE','PRODUCT_EDUCATION','NEW_ARRIVAL','OFFER_CAMPAIGN','CUSTOMER_TRUST','ENGAGEMENT']).optional(),
  tone: z.enum(['friendly','premium','minimal','energetic','informative']).optional(),
  scheduledAt: z.string().datetime().optional(),
  intervalDays: z.number().int().min(1).max(90).optional(),
  approvalRequired: z.boolean().optional(),
  autoPublish: z.boolean().optional(),
  maxPosts: z.number().int().min(1).max(1000).nullable().optional(),
  refreshProductSnapshot: z.boolean().optional(),
}).strict();

async function loadProduct(admin: any, productId: string) {
  const { data, error } = await admin.from('store_products')
    .select('id,name,sku,price,stock,published,archived,image_url,product_data,updated_at')
    .eq('id', productId).maybeSingle();
  if (error) throw new Error('Product could not be loaded from the catalog.');
  if (!data || !data.published || data.archived) throw new Error('Only published, active products can be promoted.');
  const stored = data.product_data && typeof data.product_data === 'object' ? data.product_data as Record<string, unknown> : {};
  const images = Array.isArray(stored.images) ? stored.images.filter((v): v is string => typeof v === 'string' && /^https:\/\//.test(v)).slice(0, 10) : [];
  const imageUrl = images[0] || (typeof data.image_url === 'string' ? data.image_url : '');
  const videoUrl = typeof stored.videoUrl === 'string' && /^https:\/\//.test(stored.videoUrl) ? stored.videoUrl : '';
  return {
    row: data,
    product: {
      id: data.id, name: data.name, sku: data.sku || stored.sku || '',
      price: Number(data.price), stock: Number(data.stock), description: String(stored.shortDescription || stored.description || ''),
      category: String(stored.category || ''), brand: String(stored.brand || ''),
      compareAtPrice: Number(stored.compareAtPrice || 0) > Number(data.price) ? Number(stored.compareAtPrice) : undefined,
      images: images.length ? images : imageUrl ? [imageUrl] : [], videoUrl,
      slug: stored.slug, productUrl: productUrl(stored.slug, data.id),
    },
  };
}


export async function GET(request: NextRequest) {
  try {
    const access = await requireSocialAdmin(request);
    if ('response' in access) return access.response;
    const kind = request.nextUrl.searchParams.get('kind') || 'posts';
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)));
    if (kind === 'accounts') {
      const { data, error } = await access.admin.from('social_accounts').select('id,provider,provider_account_id,account_name,token_expires_at,status,created_at,updated_at').order('created_at', { ascending: false });
      if (error) return socialError('Accounts unavailable. Apply the social publishing migration first.', 503);
      return NextResponse.json({ accounts: data || [] }, { headers: noStoreHeaders });
    }
    if (kind === 'promotions') {
      const { data, error } = await access.admin.from('social_promotions').select('*').order('updated_at', { ascending: false }).limit(limit);
      if (error) return socialError('Promotions unavailable. Apply the social publishing migration first.', 503);
      return NextResponse.json({ promotions: data || [] }, { headers: noStoreHeaders });
    }
    const { data, error } = await access.admin.from('social_posts').select('id,promotion_id,product_id,account_id,caption,media_urls,product_url,post_kind,status,scheduled_at,published_at,provider_post_id,last_error,created_at,updated_at').order('created_at', { ascending: false }).limit(limit);
    if (error) return socialError('Posts unavailable. Apply the social publishing migration first.', 503);
    return NextResponse.json({ posts: data || [] }, { headers: noStoreHeaders });
  } catch {
    return socialError('Social posts could not be loaded.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireSocialAdmin(request);
    if ('response' in access) return access.response;
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return socialError('Invalid social publishing request.', 400);
    const body = parsed.data;
    const admin = access.admin;
    if (body.action === 'generate_caption' || body.action === 'create_draft' || body.action === 'create_promotion') {
      const selectedAccountIds = [...new Set(body.accountIds?.length ? body.accountIds : body.accountId ? [body.accountId] : [])];
      if (!body.productId || !selectedAccountIds.length) return socialError('Select a product and at least one connected Facebook Page.', 400);
      const { product } = await loadProduct(admin, body.productId);
      const { data: validAccounts, error: accountError } = await admin.from('social_accounts').select('id,status').in('id', selectedAccountIds).eq('status','CONNECTED');
      if (accountError || !validAccounts || validAccounts.length !== selectedAccountIds.length) return socialError('One or more selected Facebook Pages are disconnected. Refresh the Page list.', 400);
      if (body.action === 'create_promotion') {
        const nextRunAt = new Date(Date.now() + (body.intervalDays || 3) * 86400000).toISOString();
        const promotionRows = selectedAccountIds.map((accountId) => ({
          product_id: body.productId, product_name_snapshot: product.name, account_id: accountId,
          status: 'ACTIVE', interval_days: body.intervalDays || 3, approval_required: body.approvalRequired !== false,
          auto_publish: body.autoPublish === true && body.approvalRequired === false, max_posts: body.maxPosts ?? null,
          next_run_at: nextRunAt, created_by: access.userId,
        }));
        const { data, error } = await admin.from('social_promotions').insert(promotionRows).select('*');
        if (error || !data?.length) return socialError('Promotion could not be created for every selected Page. Check whether an active promotion already exists for one of them.', 409);
        await admin.from('social_audit_logs').insert(data.map((promotion: {id:string}) => ({
          actor_id: access.userId, action: 'PROMOTION_CREATED', entity_type: 'social_promotion', entity_id: promotion.id, details: { productId: body.productId },
        })));
        return NextResponse.json({ promotion: data[0], promotions: data }, { headers: noStoreHeaders });
      }
      const { data: prior } = await admin.from('social_posts').select('caption').eq('product_id', body.productId).eq('status','PUBLISHED').order('published_at',{ascending:false}).limit(8);
      const contentGoal = body.contentGoal || 'PRODUCT_SHOWCASE';
      const caption = body.caption?.trim() || await generateProductCaption(product, (prior || []).map((p: {caption:string})=>p.caption), body.language || 'bn', contentGoal, body.tone || 'friendly');
      if (body.action === 'generate_caption') return NextResponse.json({ caption }, { headers: noStoreHeaders });
      const mediaUrls = body.mediaUrls || (product.images as string[]).slice(0, 1);
      if (product.videoUrl && mediaUrls.includes(product.videoUrl) && mediaUrls.length !== 1) return socialError('A Facebook video post can contain one video at a time.', 400);
      const rows = selectedAccountIds.map((accountId) => ({
        product_id: body.productId, product_price_snapshot: product.price, product_stock_snapshot: product.stock, account_id: accountId, caption, media_urls: mediaUrls, content_goal: contentGoal,
        product_url: product.productUrl, post_kind: product.videoUrl && mediaUrls.includes(product.videoUrl) ? 'VIDEO' : 'FEED',
        status: 'DRAFT', created_by: access.userId, idempotency_key: crypto.randomUUID(),
      }));
      const { data, error } = await admin.from('social_posts').insert(rows).select('id,product_id,account_id,caption,media_urls,product_url,status,created_at');
      if (error || !data?.length) return socialError('Drafts could not be saved for every selected Page.', 503);
      return NextResponse.json({ post: data[0], posts: data }, { headers: noStoreHeaders });
    }

    if (body.action === 'update_post' || body.action === 'schedule_post' || body.action === 'approve_post' || body.action === 'cancel_post' || body.action === 'publish_now') {
      if (!body.postId) return socialError('Post ID is required.', 400);
      const { data: current, error: currentError } = await admin.from('social_posts').select('*').eq('id', body.postId).maybeSingle();
      if (currentError || !current) return socialError('Post not found.', 404);
      if (body.action === 'publish_now') {
        if (current.status === 'UNCERTAIN') return socialError('The previous Facebook result is uncertain. Check the Page first; this post is locked to prevent duplicate publishing.', 409);
        if (current.status === 'AWAITING_APPROVAL' && !current.approved_at) return socialError('Approve this post before publishing.', 409);
        const result = await publishPost(admin, body.postId);
        return NextResponse.json(result, { headers: noStoreHeaders });
      }
      if (body.action === 'cancel_post') {
        const { error } = await admin.from('social_posts').update({ status: 'CANCELLED', scheduled_at: null, updated_at: new Date().toISOString() }).eq('id', body.postId).in('status',['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED']);
        if (error) return socialError('Post could not be cancelled.', 503);
        return NextResponse.json({ success: true }, { headers: noStoreHeaders });
      }
      if (body.action === 'approve_post') {
        const { error } = await admin.from('social_posts').update({ status: 'SCHEDULED', approved_by: access.userId, approved_at: new Date().toISOString(), scheduled_at: current.scheduled_at || new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', body.postId).in('status',['DRAFT','AWAITING_APPROVAL','SCHEDULED']);
        if (error) return socialError('Post could not be approved.', 503);
        return NextResponse.json({ success: true }, { headers: noStoreHeaders });
      }
      if (body.action === 'update_post') {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.contentGoal !== undefined) patch.content_goal = body.contentGoal;
        if (body.caption !== undefined) patch.caption = body.caption.trim();
        if (body.mediaUrls !== undefined) patch.media_urls = body.mediaUrls;
        if (body.caption !== undefined && !body.caption.trim()) return socialError('Caption cannot be empty.', 400);
        if (current.product_id) {
          const { data: latestProduct, error: latestProductError } = await admin.from('store_products').select('price,stock,published,archived,product_data').eq('id', current.product_id).maybeSingle();
          if (latestProductError || !latestProduct || !latestProduct.published || latestProduct.archived || Number(latestProduct.stock) <= 0) {
            return socialError('The product is no longer available for promotion.', 409);
          }
          if (current.product_price_snapshot != null && Number(current.product_price_snapshot) !== Number(latestProduct.price) && !body.refreshProductSnapshot) {
            return socialError('Product price changed. Generate a fresh AI caption before saving this draft.', 409);
          }
          if (body.refreshProductSnapshot) {
            patch.product_price_snapshot = Number(latestProduct.price);
            patch.product_stock_snapshot = Number(latestProduct.stock);
          }
          if (body.mediaUrls !== undefined) {
            const stored = latestProduct.product_data && typeof latestProduct.product_data === 'object' ? latestProduct.product_data as Record<string, unknown> : {};
            const videoUrl = typeof stored.videoUrl === 'string' ? stored.videoUrl : '';
            patch.post_kind = videoUrl && body.mediaUrls.includes(videoUrl) ? 'VIDEO' : 'FEED';
          }
        }
        const { error } = await admin.from('social_posts').update(patch).eq('id', body.postId).in('status',['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED']);
        if (error) return socialError('Post could not be updated.', 503);
        return NextResponse.json({ success: true }, { headers: noStoreHeaders });
      }
      if (!body.scheduledAt || Number.isNaN(Date.parse(body.scheduledAt)) || Date.parse(body.scheduledAt) < Date.now() + 60000) return socialError('Choose a future time at least one minute from now.', 400);
      const { error } = await admin.from('social_posts').update({
        scheduled_at: body.scheduledAt, status: 'SCHEDULED',
        approved_by: access.userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', body.postId).in('status',['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED']);
      if (error) return socialError('Post could not be scheduled.', 503);
      return NextResponse.json({ success: true }, { headers: noStoreHeaders });
    }

    if (body.action === 'disconnect_account') {
      if (!body.accountId) return socialError('Facebook Page ID is required.', 400);
      const { error } = await admin.from('social_accounts').update({ status: 'DISCONNECTED', updated_at: new Date().toISOString() }).eq('id', body.accountId);
      if (error) return socialError('Facebook Page could not be disconnected.', 503);
      await admin.from('social_promotions').update({ status: 'PAUSED', next_run_at: null, updated_at: new Date().toISOString() }).eq('account_id', body.accountId).eq('status','ACTIVE');
      await admin.from('social_audit_logs').insert({ actor_id: access.userId, action: 'SOCIAL_ACCOUNT_DISCONNECTED', entity_type: 'social_account', entity_id: body.accountId, details: {} });
      return NextResponse.json({ success: true }, { headers: noStoreHeaders });
    }

    if (body.action === 'pause_promotion' || body.action === 'resume_promotion') {
      if (!body.promotionId) return socialError('Promotion ID is required.', 400);
      const { data: existingPromotion } = await admin.from('social_promotions').select('interval_days').eq('id', body.promotionId).maybeSingle();
      const update = body.action === 'pause_promotion'
        ? { status: 'PAUSED', updated_at: new Date().toISOString() }
        : { status: 'ACTIVE', next_run_at: new Date(Date.now() + Number(existingPromotion?.interval_days || 3) * 86400000).toISOString(), updated_at: new Date().toISOString() };
      const { error } = await admin.from('social_promotions').update(update).eq('id', body.promotionId);
      if (error) return socialError('Promotion could not be updated. Check whether another active promotion already exists for this product and Page.', 409);
      return NextResponse.json({ success: true }, { headers: noStoreHeaders });
    }
    return socialError('Unsupported action.', 400);
  } catch (error) {
    return socialError(error instanceof Error ? error.message : 'Social publishing request failed.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireSocialAdmin(request);
    if ('response' in access) return access.response;
    const postId = request.nextUrl.searchParams.get('postId');
    if (!postId) return socialError('Post ID is required.', 400);
    const { error } = await access.admin.from('social_posts').delete().eq('id', postId).eq('status','DRAFT');
    if (error) return socialError('Only drafts can be deleted.', 503);
    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch {
    return socialError('Draft could not be deleted.', 500);
  }
}
