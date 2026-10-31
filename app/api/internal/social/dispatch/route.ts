import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateProductCaption, productUrl, noStoreHeaders } from '@/src/lib/social/server';
import { publishPost } from '@/src/lib/social/publishing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function runDispatch(request: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const authorization = request.headers.get('authorization') || '';
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: noStoreHeaders });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: 'Scheduler is not configured.' }, { status: 503, headers: noStoreHeaders });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();
  let created = 0;
  let published = 0;
  const errors: string[] = [];
  try {
    // Recover workers that died while a post was marked PUBLISHING. Never blindly retry;
    // mark the outcome uncertain and require an admin to check the Page first.
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stalePosts } = await admin.from('social_posts').select('id').eq('status','PUBLISHING').lt('updated_at',staleBefore).limit(20);
    for (const stale of stalePosts || []) {
      await admin.from('social_publish_attempts').update({
        status: 'UNCERTAIN', error_message: 'Publishing worker stopped; check Facebook before retrying.', finished_at: now,
      }).eq('post_id', stale.id).eq('status','STARTED');
      await admin.from('social_posts').update({
        status: 'FAILED', last_error: 'Publishing worker stopped; outcome uncertain. Check Facebook before retrying.',
        updated_at: now,
      }).eq('id',stale.id).eq('status','PUBLISHING');
    }

    const { data: duePromotions, error: promoError } = await admin.from('social_promotions').select('*')
      .eq('status','ACTIVE').lte('next_run_at',now).limit(10);
    if (promoError) throw new Error('Could not load due promotions. Apply the social migration.');
    for (const promo of duePromotions || []) {
      try {
        // Clear the due timestamp before creating the next draft to avoid concurrent duplicate generation.
        const { data: claimed } = await admin.from('social_promotions').update({ next_run_at: null, updated_at: now })
          .eq('id', promo.id).eq('status','ACTIVE').lte('next_run_at',now).select('id');
        if (!claimed?.length) continue;
        const { data: row } = await admin.from('store_products').select('id,name,sku,price,stock,published,archived,image_url,product_data').eq('id',promo.product_id).maybeSingle();
        const { data: account } = await admin.from('social_accounts').select('id,status').eq('id',promo.account_id).maybeSingle();
        if (!row || !row.published || row.archived || Number(row.stock) <= 0 || !account || account.status !== 'CONNECTED') {
          await admin.from('social_promotions').update({ status: 'PAUSED', next_run_at: null, updated_at: now }).eq('id',promo.id);
          continue;
        }
        const stored = row.product_data && typeof row.product_data === 'object' ? row.product_data as Record<string,unknown> : {};
        const images = Array.isArray(stored.images) ? stored.images.filter((v): v is string => typeof v === 'string' && /^https:\/\//.test(v)) : [];
        const videoUrl = typeof stored.videoUrl === 'string' && /^https:\/\//.test(stored.videoUrl) ? stored.videoUrl : '';
        const fallbackImages = images.length ? images.slice(0, 1) : (typeof row.image_url === 'string' && /^https:\/\//.test(row.image_url) ? [row.image_url] : []);
        const media = videoUrl && Number(promo.posts_published || 0) % 2 === 1 ? [videoUrl] : fallbackImages;
        const product = { id: row.id, name: row.name, sku: row.sku, price: Number(row.price), stock: Number(row.stock),
          description: String(stored.shortDescription || stored.description || ''), category: String(stored.category || ''),
          images: media, productUrl: productUrl(stored.slug,row.id) };
        const { data: prior } = await admin.from('social_posts').select('caption').eq('product_id',row.id).eq('status','PUBLISHED').order('published_at',{ascending:false}).limit(8);
        const caption = await generateProductCaption(product,(prior || []).map((p:{caption:string})=>p.caption),'bn');
        const status = promo.approval_required || !promo.auto_publish ? 'AWAITING_APPROVAL' : 'SCHEDULED';
        const { data: post, error: insertError } = await admin.from('social_posts').insert({
          promotion_id: promo.id, product_id: row.id, product_price_snapshot: Number(row.price), product_stock_snapshot: Number(row.stock), account_id: promo.account_id, caption, media_urls: media,
          product_url: product.productUrl, post_kind: videoUrl && media[0] === videoUrl ? 'VIDEO' : 'FEED', status, scheduled_at: status === 'SCHEDULED' ? now : null,
          idempotency_key: `promotion:${promo.id}:cycle:${Number(promo.posts_published || 0)+1}`,
        }).select('id').single();
        if (insertError || !post) throw new Error('Generated post could not be saved.');
        created++;
        if (status === 'SCHEDULED') {
          const result = await publishPost(admin, post.id);
          if (result.success) published++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Promotion cycle failed.';
        errors.push(`${promo.id}: ${message}`);
        await admin.from('social_promotions').update({ status: 'PAUSED', next_run_at: null, updated_at: now }).eq('id',promo.id);
        await admin.from('social_audit_logs').insert({ action:'PROMOTION_PAUSED_AFTER_ERROR', entity_type:'social_promotion', entity_id:promo.id, details:{ error:message.slice(0,500) } });
      }
    }

    const { data: duePosts, error: postError } = await admin.from('social_posts').select('id')
      .eq('status','SCHEDULED').not('approved_at','is',null).lte('scheduled_at',now).limit(10);
    if (postError) throw new Error('Could not load scheduled posts.');
    for (const post of duePosts || []) {
      try {
        const result = await publishPost(admin, post.id);
        if (result.success) published++;
      } catch (error) {
        errors.push(`${post.id}: ${error instanceof Error ? error.message : 'Publish failed'}`);
      }
    }
    return NextResponse.json({ success: true, promotionsProcessed: duePromotions?.length || 0, postsCreated: created, postsPublished: published, errors }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Scheduler failed.' }, { status: 500, headers: noStoreHeaders });
  }
}


// Vercel Cron invokes scheduled routes with GET requests.
export async function GET(request: NextRequest) {
  return runDispatch(request);
}

export async function POST(request: NextRequest) {
  return runDispatch(request);
}
