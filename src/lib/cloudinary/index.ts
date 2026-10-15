/**
 * Cloudinary Media Optimization & Transformation Adapter for Zelux
 * Generates responsive AVIF/WebP srcset transformations and handles upload credentials.
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
  crop?: 'fill' | 'scale' | 'thumb' | 'fit';
  gravity?: 'auto' | 'center';
}

const CLOUD_NAME = (typeof process !== 'undefined' && process.env?.CLOUDINARY_CLOUD_NAME) || 'zelux';

/**
 * Returns optimized media URL with automatic modern format (AVIF/WebP) and compression
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: CloudinaryTransformOptions = {}
): string {
  if (!originalUrl) return '';

  // If already a Cloudinary asset
  if (originalUrl.includes('cloudinary.com')) {
    const transformations = [];
    if (options.crop) transformations.push(`c_${options.crop}`);
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.gravity) transformations.push(`g_${options.gravity}`);
    transformations.push(`f_${options.format || 'auto'}`);
    transformations.push(`q_${options.quality || 'auto'}`);

    const transformStr = transformations.join(',');
    return originalUrl.replace('/upload/', `/upload/${transformStr}/`);
  }

  // If external CDN asset (e.g. Unsplash), apply native query transforms
  if (originalUrl.includes('unsplash.com')) {
    try {
      const url = new URL(originalUrl);
      if (options.width) url.searchParams.set('w', String(options.width));
      if (options.height) url.searchParams.set('h', String(options.height));
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', options.crop === 'thumb' ? 'crop' : 'crop');
      url.searchParams.set('q', '80');
      return url.toString();
    } catch {
      return originalUrl;
    }
  }

  return originalUrl;
}

/**
 * Generate standard srcset strings for responsive hero and product gallery displays
 */
export function generateSrcSet(originalUrl: string, widths = [320, 480, 768, 1024, 1440]): string {
  return widths
    .map((w) => `${getOptimizedImageUrl(originalUrl, { width: w, format: 'auto' })} ${w}w`)
    .join(', ');
}
