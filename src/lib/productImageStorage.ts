'use client';

import { supabase } from './supabase';

type CloudinaryResourceType = 'image' | 'video';

function getCloudinaryAsset(url: string): { publicId: string; resourceType: CloudinaryResourceType } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
    const match = parsed.pathname.match(/^\/[^/]+\/(image|video)\/upload\/(.*)$/);
    if (!match) return null;
    const resourceType = match[1] as CloudinaryResourceType;
    const segments = match[2].split('/').filter(Boolean);
    while (segments.length && (/^(?:[a-z]{1,3}_[^,]+)(?:,.*)?$/.test(segments[0]) || /^v\d+$/.test(segments[0]))) {
      segments.shift();
    }
    if (!segments.length) return null;
    const last = segments[segments.length - 1];
    segments[segments.length - 1] = last.replace(/\.[a-zA-Z0-9]{1,8}$/, '');
    const publicId = segments.join('/');
    if (!publicId.startsWith('zelux/')) return null;
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sign in as an administrator before managing media.');
  return data.session.access_token;
}

/** Upload an image or video directly to Cloudinary using a short-lived, server-signed request. */
export async function uploadCloudinaryMedia(
  file: File,
  ownerId: string,
  resourceType: CloudinaryResourceType = file.type.startsWith('video/') ? 'video' : 'image',
  scope = ownerId === 'storefront' ? 'storefront' : 'products',
): Promise<{ url: string; publicId: string; resourceType: CloudinaryResourceType; version?: number }> {
  const isValidType = resourceType === 'image'
    ? ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)
    : ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
  if (!isValidType) throw new Error(resourceType === 'image'
    ? 'Choose a JPG, PNG, WebP, AVIF, or GIF image.'
    : 'Choose an MP4, WebM, or MOV video.');
  const maxBytes = resourceType === 'image' ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(resourceType === 'image' ? 'Images must be 20 MB or smaller.' : 'Videos must be 100 MB or smaller.');
  }

  const token = await getAccessToken();
  const signatureResponse = await fetch('/api/media/cloudinary-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ scope, ownerId, resourceType }),
    cache: 'no-store',
  });
  const signature = await signatureResponse.json().catch(() => ({}));
  if (!signatureResponse.ok) throw new Error(typeof signature.error === 'string' ? signature.error : 'Secure media upload could not be initialized.');

  const form = new FormData();
  form.set('file', file);
  form.set('api_key', signature.apiKey);
  form.set('timestamp', String(signature.timestamp));
  form.set('folder', signature.folder);
  form.set('signature', signature.signature);
  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  const uploaded = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok || typeof uploaded.secure_url !== 'string' || typeof uploaded.public_id !== 'string') {
    throw new Error(typeof uploaded.error?.message === 'string' ? uploaded.error.message : 'Cloudinary upload failed.');
  }
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    resourceType,
    ...(typeof uploaded.version === 'number' ? { version: uploaded.version } : {}),
  };
}

/** Convert inline image data to Cloudinary-hosted URLs. Hosted URLs are preserved. */
export async function persistProductImageUrls(
  imageUrls: string[],
  productId: string,
  scope = productId === 'storefront' ? 'storefront' : 'products',
): Promise<string[]> {
  const result: string[] = [];
  const uploaded: string[] = [];
  try {
    for (const [index, imageUrl] of imageUrls.entries()) {
      if (!imageUrl.startsWith('data:')) {
        result.push(imageUrl);
        continue;
      }
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('A selected image could not be read.');
      const blob = await response.blob();
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(blob.type)) {
        throw new Error('Images must be JPG, PNG, WebP, AVIF, or GIF.');
      }
      const extension = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `image-${index}.${extension}`, { type: blob.type });
      const asset = await uploadCloudinaryMedia(file, productId, 'image', scope);
      result.push(asset.url);
      uploaded.push(asset.url);
    }
    return result;
  } catch (error) {
    await removeProductImageUrls(uploaded, productId, [], scope);
    throw error;
  }
}

/**
 * Delete only application-owned Cloudinary assets or legacy files inside this
 * record's own Supabase Storage folder. Call only after the database reference is updated.
 */
export async function removeProductImageUrls(
  imageUrls: string[],
  ownerId: string,
  keepUrls: string[] = [],
  scopeOverride?: string,
): Promise<void> {
  const keep = new Set(keepUrls);
  const oldUrls = [...new Set(imageUrls.filter((url) => url && !keep.has(url)))];
  if (!oldUrls.length) return;

  let token = '';
  try {
    token = await getAccessToken();
  } catch {
    console.warn('Media cleanup skipped because an authenticated admin session is unavailable.');
    return;
  }

  const legacyPaths: string[] = [];
  for (const url of oldUrls) {
    const cloudinaryAsset = getCloudinaryAsset(url);
    if (cloudinaryAsset) {
      const scope = scopeOverride || (ownerId === 'storefront' ? 'storefront' : 'products');
      const ownedPrefix = `zelux/${scope}/${ownerId}/`;
      // A duplicated product can reference another product's media. Never delete shared assets.
      if (!cloudinaryAsset.publicId.startsWith(ownedPrefix)) continue;
      try {
        const response = await fetch('/api/media/cloudinary-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...cloudinaryAsset, ownerId, scope }),
          cache: 'no-store',
        });
        if (!response.ok) console.warn('Cloudinary cleanup failed; retry may be needed.');
      } catch (error) {
        console.warn('Cloudinary cleanup request failed.', error);
      }
      continue;
    }

    // Backward-compatible cleanup for assets uploaded by older builds to Supabase Storage.
    try {
      const parsed = new URL(url);
      const marker = '/storage/v1/object/public/zelux-products/';
      const index = parsed.pathname.indexOf(marker);
      if (index < 0) continue;
      const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
      if (path.startsWith(`${ownerId}/`)) legacyPaths.push(path);
    } catch {
      // Ignore invalid and externally hosted URLs.
    }
  }

  if (legacyPaths.length) {
    const { error } = await supabase.storage.from('zelux-products').remove([...new Set(legacyPaths)]);
    if (error) console.warn('Legacy Supabase image cleanup failed.', error.message);
  }
}

/** Extract the stable Cloudinary public_id from an application-owned delivery URL. */
export function getCloudinaryPublicId(url: string): string | undefined {
  return getCloudinaryAsset(url)?.publicId;
}
