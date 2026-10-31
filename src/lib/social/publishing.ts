import { cleanSocialText, decryptSocialToken } from './server';

export async function publishPost(admin: any, postId: string) {
  const { data: post, error: postError } = await admin.from('social_posts').select('*').eq('id', postId).maybeSingle();
  if (postError || !post) throw new Error('Post was not found.');
  if (!['SCHEDULED','AWAITING_APPROVAL','DRAFT','FAILED'].includes(post.status)) throw new Error(`Post cannot be published from status ${post.status}.`);
  const failBeforePublish = async (message: string) => {
    await admin.from('social_posts').update({ status: 'FAILED', last_error: message.slice(0,1000), updated_at: new Date().toISOString() })
      .eq('id', post.id).in('status',['DRAFT','AWAITING_APPROVAL','SCHEDULED','FAILED']);
    if (post.promotion_id) await admin.from('social_promotions').update({ status: 'PAUSED', next_run_at: null, updated_at: new Date().toISOString() }).eq('id',post.promotion_id);
    throw new Error(message);
  };
  const { data: account, error: accountError } = await admin.from('social_accounts').select('*').eq('id', post.account_id).eq('status','CONNECTED').maybeSingle();
  if (accountError || !account) await failBeforePublish('Facebook Page is disconnected or requires reconnection. Reconnect the Page before retrying.');
  let currentProduct: Record<string, any> | null = null;
  if (post.product_id) {
    const { data: product, error: productError } = await admin.from('store_products')
      .select('id,name,sku,published,archived,stock,price,product_data').eq('id', post.product_id).maybeSingle();
    if (productError || !product || !product.published || product.archived || Number(product.stock) <= 0) {
      await failBeforePublish('The product is no longer available for promotion. The post was stopped.');
    }
    currentProduct = product as Record<string, any>;
    if (post.product_price_snapshot != null && Number(post.product_price_snapshot) !== Number(product.price)) {
      await failBeforePublish('The product price changed after this draft was created. Refresh the AI caption, review the new price, and save a new draft before publishing.');
    }
  }
  let token: string;
  try {
    token = decryptSocialToken(account.access_token_ciphertext);
  } catch {
    const message = 'The saved Facebook token cannot be decrypted. Reconnect the Page and verify SOCIAL_TOKEN_ENCRYPTION_KEY.';
    await admin.from('social_accounts').update({ status: 'RECONNECT_REQUIRED', updated_at: new Date().toISOString() }).eq('id', account.id);
    await admin.from('social_posts').update({ status: 'FAILED', last_error: message, updated_at: new Date().toISOString() }).eq('id', post.id);
    if (post.promotion_id) await admin.from('social_promotions').update({ status: 'PAUSED', next_run_at: null, updated_at: new Date().toISOString() }).eq('id', post.promotion_id);
    throw new Error(message);
  }
  const base = `https://graph.facebook.com/v26.0/${encodeURIComponent(account.provider_account_id)}`;
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls.filter((v: unknown): v is string => typeof v === 'string' && /^https:\/\//.test(v)).slice(0, 10) : [];
  const caption = cleanSocialText(String(post.caption || '')).slice(0, 3500);
  if (!caption) throw new Error('Post caption is empty.');
  // Atomically claim the post before calling Meta. A concurrent scheduler/manual click must not publish twice.
  const { data: claimed, error: claimError } = await admin.from('social_posts')
    .update({ status: 'PUBLISHING', last_error: null, updated_at: new Date().toISOString() })
    .eq('id', post.id).in('status', ['SCHEDULED','AWAITING_APPROVAL','DRAFT','FAILED']).select('id');
  if (claimError || !claimed?.length) throw new Error('This post is already being processed or its status changed. Refresh before retrying.');
  const attemptNumberResult = await admin.from('social_publish_attempts').select('attempt_number').eq('post_id', post.id).order('attempt_number', { ascending: false }).limit(1);
  const attemptNumber = (attemptNumberResult.data?.[0]?.attempt_number || 0) + 1;
  const { data: attempt, error: attemptError } = await admin.from('social_publish_attempts').insert({ post_id: post.id, attempt_number: attemptNumber, status: 'STARTED' }).select('id').single();
  if (attemptError || !attempt) {
    await admin.from('social_posts').update({ status: post.status, updated_at: new Date().toISOString() }).eq('id', post.id).eq('status','PUBLISHING');
    throw new Error('Publishing attempt could not be recorded.');
  }

  let definitiveMetaRejection = false;
  try {
    const storedProductData = currentProduct?.product_data && typeof currentProduct.product_data === 'object' ? currentProduct.product_data as Record<string, unknown> : {};
    const currentPrice = Number(currentProduct?.price || 0);
    const compareAtPrice = Number(storedProductData.compareAtPrice || storedProductData.compare_at_price || 0);
    const discountPercent = compareAtPrice > currentPrice && compareAtPrice > 0 ? Math.round((1 - currentPrice / compareAtPrice) * 100) : 0;
    const productDescription = cleanSocialText(String(storedProductData.shortDescription || storedProductData.description || '')).slice(0, 400);
    const productFacts = currentProduct ? [
      `Product: ${cleanSocialText(String(currentProduct.name || ''))}`,
      ...(storedProductData.brand ? [`Brand: ${cleanSocialText(String(storedProductData.brand))}`] : []),
      ...(storedProductData.category ? [`Category: ${cleanSocialText(String(storedProductData.category))}`] : []),
      ...(productDescription ? [`Details: ${productDescription}`] : []),
      `Price: ৳${currentPrice.toLocaleString('en-US')}`,
      ...(discountPercent ? [`Regular price: ৳${compareAtPrice.toLocaleString('en-US')}`, `Discount: ${discountPercent}%`] : []),
      ...(currentProduct.sku ? [`SKU: ${cleanSocialText(String(currentProduct.sku))}`] : []),
      `Availability: ${Number(currentProduct.stock || 0) > 0 ? 'In stock' : 'Out of stock'}`,
    ].filter(Boolean).join('\n') : '';
    const productLink = post.product_url ? `Shop now: ${post.product_url}` : '';
    const captionWithLink = cleanSocialText([caption, productFacts, productLink].filter(Boolean).join('\n\n')).slice(0, 5000);
    let endpoint = `${base}/feed`;
    const body: Record<string, string> = { message: captionWithLink, access_token: token };
    let response: Response;
    let result: { id?: string; post_id?: string; error?: { message?: string; code?: number } };
    const isVideo = post.post_kind === 'VIDEO';
    if (isVideo && mediaUrls.length) {
      endpoint = `${base}/videos`;
      body.file_url = mediaUrls[0];
      body.description = captionWithLink;
      delete body.message;
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), signal: AbortSignal.timeout(60000) });
      result = await response.json() as typeof result;
    } else if (mediaUrls.length > 1) {
      // Facebook multi-photo Page posts require each photo to be uploaded unpublished,
      // then attached to one /feed request. Publishing each photo separately is incorrect.
      const uploaded: string[] = [];
      for (const mediaUrl of mediaUrls) {
        const photo = await fetch(`${base}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ url: mediaUrl, published: 'false', access_token: token }), signal: AbortSignal.timeout(30000) });
        const photoResult = await photo.json() as { id?: string; error?: { message?: string; code?: number } };
        if (!photo.ok || !photoResult.id) throw new Error(photoResult.error?.message || `Facebook could not prepare an album photo (HTTP ${photo.status}).`);
        uploaded.push(photoResult.id);
      }
      endpoint = `${base}/feed`;
      const albumBody = new URLSearchParams({ message: captionWithLink, access_token: token });
      uploaded.forEach((mediaId, index) => albumBody.set(`attached_media[${index}]`, JSON.stringify({ media_fbid: mediaId })));
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: albumBody, signal: AbortSignal.timeout(30000) });
      result = await response.json() as typeof result;
    } else if (mediaUrls.length === 1) {
      endpoint = `${base}/photos`;
      body.url = mediaUrls[0];
      body.caption = captionWithLink;
      delete body.message;
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), signal: AbortSignal.timeout(30000) });
      result = await response.json() as typeof result;
    } else {
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body), signal: AbortSignal.timeout(25000) });
      result = await response.json() as typeof result;
    }
    if (!response.ok || !(result.id || result.post_id)) {
      const message = result.error?.message || (response.ok ? 'Meta accepted the request but returned no post ID; the result is uncertain. Check the Facebook Page before retrying.' : `Meta publishing returned HTTP ${response.status}.`);
      definitiveMetaRejection = !response.ok;
      await admin.from('social_publish_attempts').update({ status: response.ok ? 'UNCERTAIN' : 'FAILED', error_code: String(result.error?.code || response.status), error_message: message.slice(0, 1000), finished_at: new Date().toISOString() }).eq('id', attempt.id);
      await admin.from('social_posts').update({ status: response.ok ? 'UNCERTAIN' : 'FAILED', last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq('id', post.id);
      if (Number(result.error?.code) === 190) {
        await admin.from('social_accounts').update({ status: 'RECONNECT_REQUIRED', updated_at: new Date().toISOString() }).eq('id', account.id);
      }
      throw new Error(message);
    }
    const providerPostId = result.post_id || result.id!;
    const { error: attemptSaveError } = await admin.from('social_publish_attempts').update({ status: 'SUCCEEDED', provider_post_id: providerPostId, finished_at: new Date().toISOString() }).eq('id', attempt.id);
    if (attemptSaveError) throw new Error('Facebook accepted the post, but its publishing record could not be saved. Verify the Page before retrying.');
    const { error: postSaveError } = await admin.from('social_posts').update({ status: 'PUBLISHED', provider_post_id: providerPostId, published_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', post.id).eq('status','PUBLISHING');
    if (postSaveError) {
      await admin.from('social_publish_attempts').update({ status: 'UNCERTAIN', error_message: 'Facebook accepted the post, but its post record could not be updated. Verify the Page before retrying.', finished_at: new Date().toISOString() }).eq('id', attempt.id);
      throw new Error('Facebook accepted the post, but its post record could not be updated. Verify the Page before retrying.');
    }
    if (post.promotion_id) {
      const { data: promo } = await admin.from('social_promotions').select('posts_published,interval_days,max_posts').eq('id', post.promotion_id).maybeSingle();
      if (promo) {
        const count = Number(promo.posts_published || 0) + 1;
        const { data: latestProduct } = post.product_id ? await admin.from('store_products').select('published,archived,stock').eq('id', post.product_id).maybeSingle() : { data: null };
        const shouldContinue = (!promo.max_posts || count < promo.max_posts) && (!post.product_id || Boolean(latestProduct?.published && !latestProduct?.archived && latestProduct.stock > 0));
        await admin.from('social_promotions').update({ posts_published: count, status: shouldContinue ? 'ACTIVE' : 'COMPLETED', next_run_at: shouldContinue ? new Date(Date.now() + Number(promo.interval_days || 3) * 86400000).toISOString() : null, updated_at: new Date().toISOString() }).eq('id', post.promotion_id);
      }
    }
    await admin.from('social_audit_logs').insert({ actor_id: null, action: 'POST_PUBLISHED', entity_type: 'social_post', entity_id: post.id, details: { providerPostId } });
    return { success: true, providerPostId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publishing failed.';
    const finalStatus = definitiveMetaRejection ? 'FAILED' : 'UNCERTAIN';
    await admin.from('social_publish_attempts').update({
      status: finalStatus, error_message: message.slice(0, 1000), finished_at: new Date().toISOString(),
    }).eq('id', attempt.id).eq('status','STARTED');
    await admin.from('social_posts').update({ status: finalStatus, last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq('id', post.id).eq('status','PUBLISHING');
    if (post.promotion_id) {
      await admin.from('social_promotions').update({ status: 'PAUSED', next_run_at: null, updated_at: new Date().toISOString() }).eq('id', post.promotion_id);
    }
    throw error;
  }
}

