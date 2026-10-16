'use client';

import { supabase } from './supabase';

/**
 * Upload embedded product/CMS images and persist only hosted URLs.
 * Existing hosted URLs are preserved to avoid needless duplicate uploads.
 */
export async function persistProductImageUrls(imageUrls: string[], productId: string): Promise<string[]> {
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
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
        throw new Error('Images must be JPG, PNG, or WebP.');
      }
      if (blob.size > 5 * 1024 * 1024) throw new Error('Each image must be 5 MB or smaller.');

      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const randomSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      const path = `${productId}/${Date.now()}-${index}-${randomSuffix}.${extension}`;
      const { error } = await supabase.storage.from('zelux-products').upload(path, blob, {
        contentType: blob.type,
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) throw new Error('Image storage is not ready. Apply the Supabase storage migration and try again.');

      const publicUrl = supabase.storage.from('zelux-products').getPublicUrl(path).data.publicUrl;
      result.push(publicUrl);
      uploaded.push(publicUrl);
    }
    return result;
  } catch (error) {
    // If any later image fails, clean up files uploaded earlier in this attempt.
    await removeProductImageUrls(uploaded, productId);
    throw error;
  }
}

/**
 * Delete only images inside this record's own managed Storage folder.
 * Never delete externally hosted URLs or images belonging to another product.
 */
export async function removeProductImageUrls(
  imageUrls: string[],
  ownerId: string,
  keepUrls: string[] = [],
): Promise<void> {
  const keep = new Set(keepUrls);
  const prefix = `${ownerId}/`;
  const paths = imageUrls
    .filter((url) => !keep.has(url))
    .map((url) => {
      try {
        const parsed = new URL(url);
        const marker = '/storage/v1/object/public/zelux-products/';
        const index = parsed.pathname.indexOf(marker);
        if (index < 0) return null;
        const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
        return path.startsWith(prefix) ? path : null;
      } catch {
        return null;
      }
    })
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;
  const { error } = await supabase.storage.from('zelux-products').remove([...new Set(paths)]);
  if (error) {
    // The database save is already complete; a cleanup failure is an orphan-file
    // maintenance issue and must not make a successful product save appear failed.
    console.warn('Old managed image cleanup failed.', error.message);
  }
}
