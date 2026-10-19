import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSrcSet, getOptimizedImageUrl } from '../../src/lib/cloudinary';

const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1234567890/zelux/products/item.jpg';

test('Cloudinary delivery applies responsive dimensions, auto format, and auto quality', () => {
  const url = getOptimizedImageUrl(cloudinaryUrl, {
    width: 480,
    height: 640,
    crop: 'fill',
    gravity: 'auto',
    format: 'auto',
    quality: 'auto',
  });
  assert.match(url, /\/image\/upload\/c_fill,w_480,h_640,g_auto,f_auto,q_auto\/v1234567890\/zelux\/products\/item\.jpg$/);
});

test('Cloudinary transformations replace an existing transform instead of stacking', () => {
  const transformed = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_1600,q_90/v1234567890/zelux/products/item.jpg';
  const url = getOptimizedImageUrl(transformed, { width: 320, crop: 'fit' });
  assert.equal((url.match(/\/image\/upload\//g) || []).length, 1);
  assert.match(url, /\/image\/upload\/c_fit,w_320,f_auto,q_auto\/v1234567890/);
});

test('responsive srcset emits one optimized candidate per requested width', () => {
  const srcSet = generateSrcSet(cloudinaryUrl, [240, 480, 800], { crop: 'fit' });
  assert.equal(srcSet.split(', ').length, 3);
  assert.match(srcSet, /w_240,f_auto,q_auto.* 240w/);
  assert.match(srcSet, /w_480,f_auto,q_auto.* 480w/);
  assert.match(srcSet, /w_800,f_auto,q_auto.* 800w/);
});

test('Supabase and unknown image providers are preserved without URL rewriting', () => {
  const supabaseUrl = 'https://project.supabase.co/storage/v1/object/public/products/item.jpg';
  const otherUrl = 'https://cdn.example.com/item.jpg';
  assert.equal(getOptimizedImageUrl(supabaseUrl, { width: 320 }), supabaseUrl);
  assert.equal(getOptimizedImageUrl(otherUrl, { width: 320 }), otherUrl);
  assert.equal(generateSrcSet(supabaseUrl, [320, 640]), '');
});

test('Unsplash image URLs receive dimension and format optimization', () => {
  const url = getOptimizedImageUrl('https://images.unsplash.com/photo-123?ixlib=test', {
    width: 320,
    height: 240,
    crop: 'fill',
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('w'), '320');
  assert.equal(parsed.searchParams.get('h'), '240');
  assert.equal(parsed.searchParams.get('auto'), 'format');
  assert.equal(parsed.searchParams.get('fit'), 'crop');
});
