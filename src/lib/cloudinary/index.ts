/**
 * Cloudinary delivery transformations for responsive, optimized storefront images.
 * Existing Supabase Storage and other external URLs are left intact.
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
  crop?: 'fill' | 'scale' | 'thumb' | 'fit';
  gravity?: 'auto' | 'center';
}

function isCloudinaryImage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      /\/image\/upload\//.test(url.pathname);
  } catch {
    return false;
  }
}

function isUnsplashImage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'images.unsplash.com' || url.hostname === 'plus.unsplash.com');
  } catch {
    return false;
  }
}

/** Return an optimized URL without repeatedly stacking duplicate Cloudinary transforms. */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: CloudinaryTransformOptions = {},
): string {
  if (!originalUrl) return '';

  if (isCloudinaryImage(originalUrl)) {
    try {
      const url = new URL(originalUrl);
      const marker = '/image/upload/';
      const markerIndex = url.pathname.indexOf(marker);
      const prefix = url.pathname.slice(0, markerIndex + marker.length);
      let assetPath = url.pathname.slice(markerIndex + marker.length);

      // Replace an existing transformation segment instead of accumulating transforms.
      const firstSegmentEnd = assetPath.indexOf('/');
      if (firstSegmentEnd > -1 && /^(?:(?:a|b|c|d|e|f|g|h|q|w|x|y|z|ar|br|co|dpr|fl|if|l|o|pg|r|so|sp|t|u|vc|vs|w|z)_[^/]+)(?:,|$)/.test(assetPath.slice(0, firstSegmentEnd))) {
        assetPath = assetPath.slice(firstSegmentEnd + 1);
      }

      const transformations: string[] = [];
      if (options.crop) transformations.push(`c_${options.crop}`);
      if (options.width) transformations.push(`w_${Math.round(options.width)}`);
      if (options.height) transformations.push(`h_${Math.round(options.height)}`);
      if (options.gravity) transformations.push(`g_${options.gravity}`);
      transformations.push(`f_${options.format || 'auto'}`);
      transformations.push(`q_${options.quality ?? 'auto'}`);

      url.pathname = `${prefix}${transformations.join(',')}/${assetPath}`;
      return url.toString();
    } catch {
      return originalUrl;
    }
  }

  if (isUnsplashImage(originalUrl)) {
    try {
      const url = new URL(originalUrl);
      if (options.width) url.searchParams.set('w', String(Math.round(options.width)));
      if (options.height) url.searchParams.set('h', String(Math.round(options.height)));
      url.searchParams.set('auto', 'format');
      // Unsplash uses fit=crop for fill/thumb presets and fit=max to preserve the full image.
      url.searchParams.set('fit', options.crop === 'fill' || options.crop === 'thumb' ? 'crop' : 'max');
      url.searchParams.set('q', String(typeof options.quality === 'number' ? options.quality : 80));
      return url.toString();
    } catch {
      return originalUrl;
    }
  }

  // Supabase Storage and unknown providers must keep their original, valid URL.
  return originalUrl;
}

/** Generate responsive candidates only for providers that support URL transformations. */
export function generateSrcSet(
  originalUrl: string,
  widths = [320, 480, 768, 1024, 1440],
  options: Omit<CloudinaryTransformOptions, 'width'> = {},
): string {
  if (!isCloudinaryImage(originalUrl) && !isUnsplashImage(originalUrl)) return '';
  return widths
    .map((width) => `${getOptimizedImageUrl(originalUrl, { ...options, width, format: 'auto', quality: 'auto' })} ${width}w`)
    .join(', ');
}
