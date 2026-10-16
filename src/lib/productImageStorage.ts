'use client';

import { supabase } from './supabase';

/**
 * Store image files in Supabase Storage and persist only public URLs in the catalog.
 * Existing remote URLs are preserved; embedded data URLs are uploaded.
 */
export async function persistProductImageUrls(imageUrls: string[], productId: string): Promise<string[]> {
  return Promise.all(imageUrls.map(async (imageUrl, index) => {
    if (!imageUrl.startsWith('data:')) return imageUrl;

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('A selected product image could not be read.');
    const blob = await response.blob();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
      throw new Error('Product images must be JPG, PNG, or WebP.');
    }
    if (blob.size > 5 * 1024 * 1024) throw new Error('Each product image must be 5 MB or smaller.');

    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${productId}/${Date.now()}-${index}.${extension}`;
    const { error } = await supabase.storage.from('zelux-products').upload(path, blob, {
      contentType: blob.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      throw new Error('Product image storage is not ready. Apply the latest Supabase storage migration and try again.');
    }
    return supabase.storage.from('zelux-products').getPublicUrl(path).data.publicUrl;
  }));
}
