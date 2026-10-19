'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { generateSrcSet, getOptimizedImageUrl } from '../../lib/cloudinary';

const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23f1f5f9%22/%3E%3Cpath d=%22M112 214l58-68 38 42 31-35 50 61z%22 fill=%22%23cbd5e1%22/%3E%3Ccircle cx=%22165%22 cy=%22104%22 r=%2220%22 fill=%22%23cbd5e1%22/%3E%3C/svg%3E';

export type StoreImagePreset =
  | 'product-card'
  | 'product-detail'
  | 'thumbnail'
  | 'category'
  | 'hero'
  | 'logo'
  | 'avatar'
  | 'content';

type ImagePresetConfig = {
  width: number;
  height?: number;
  crop: 'fill' | 'fit';
  gravity?: 'auto' | 'center';
  widths: number[];
  sizes: string;
};

const IMAGE_PRESETS: Record<StoreImagePreset, ImagePresetConfig> = {
  'product-card': {
    width: 640, height: 480, crop: 'fill', gravity: 'auto',
    widths: [240, 320, 480, 640, 800],
    sizes: '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw',
  },
  'product-detail': {
    width: 1200, height: 1500, crop: 'fill', gravity: 'auto',
    widths: [320, 480, 640, 800, 1000, 1200],
    sizes: '(max-width: 767px) 100vw, (max-width: 1199px) 55vw, 600px',
  },
  thumbnail: {
    width: 240, height: 240, crop: 'fill', gravity: 'auto',
    widths: [96, 144, 192, 240, 320],
    sizes: '96px',
  },
  category: {
    width: 640, height: 640, crop: 'fill', gravity: 'auto',
    widths: [240, 320, 480, 640, 800],
    sizes: '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw',
  },
  hero: {
    width: 1440, height: 1000, crop: 'fill', gravity: 'auto',
    widths: [320, 480, 640, 768, 1024, 1280, 1440, 1600],
    sizes: '(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), 40vw',
  },
  logo: {
    width: 500, height: 200, crop: 'fit',
    widths: [160, 240, 320, 500, 640],
    sizes: '(max-width: 639px) 160px, 240px',
  },
  avatar: {
    width: 192, height: 192, crop: 'fill', gravity: 'auto',
    widths: [64, 96, 128, 192, 256],
    sizes: '96px',
  },
  content: {
    width: 1200, crop: 'fit',
    widths: [320, 480, 640, 768, 1024, 1200, 1600],
    sizes: '100vw',
  },
};

type StoreImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'onError'> & {
  src?: string | null;
  srcSet?: string;
  fallbackSrc?: string;
  /** Controls the Cloudinary transformation and responsive candidate widths. */
  preset?: StoreImagePreset;
};

function isTransformableImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (
      (parsed.hostname === 'res.cloudinary.com' && /\/image\/upload\//.test(parsed.pathname)) ||
      parsed.hostname === 'images.unsplash.com' ||
      parsed.hostname === 'plus.unsplash.com'
    );
  } catch {
    return false;
  }
}

/**
 * Shared image delivery component. Cloudinary/Unsplash URLs are transformed and
 * receive responsive candidates; Supabase and other supported URLs are preserved.
 * Presets keep image delivery aligned with the rendered container.
 */
export const StoreImage: React.FC<StoreImageProps> = ({
  src,
  srcSet,
  sizes,
  fallbackSrc = FALLBACK_IMAGE,
  alt = '',
  preset = 'content',
  ...props
}) => {
  const [hasFailed, setHasFailed] = useState(false);
  const candidate = typeof src === 'string' ? src.trim() : '';
  const isSafeImageSource =
    (candidate.startsWith('/') && !candidate.startsWith('//')) ||
    candidate.startsWith('blob:') ||
    /^https?:\/\//i.test(candidate) ||
    /^data:image\/(?:png|jpe?g|webp|avif|gif);base64,/i.test(candidate);
  const resolvedSource = isSafeImageSource ? candidate : fallbackSrc;
  const config = IMAGE_PRESETS[preset];

  const imageDelivery = useMemo(() => {
    if (!isSafeImageSource || !isTransformableImage(candidate)) {
      return { src: resolvedSource, srcSet: isSafeImageSource ? srcSet : undefined };
    }

    return {
      src: getOptimizedImageUrl(candidate, {
        width: config.width,
        ...(config.height ? { height: config.height } : {}),
        crop: config.crop,
        ...(config.gravity ? { gravity: config.gravity } : {}),
        format: 'auto',
        quality: 'auto',
      }),
      srcSet: generateSrcSet(candidate, config.widths, {
        ...(config.height ? { height: config.height } : {}),
        crop: config.crop,
        ...(config.gravity ? { gravity: config.gravity } : {}),
      }) || srcSet,
    };
  }, [candidate, config, isSafeImageSource, resolvedSource, srcSet]);

  useEffect(() => {
    setHasFailed(false);
  }, [candidate, imageDelivery.srcSet]);

  return (
    <img
      {...props}
      src={hasFailed ? fallbackSrc : imageDelivery.src}
      srcSet={hasFailed ? undefined : imageDelivery.srcSet}
      sizes={sizes || config.sizes}
      alt={alt}
      onError={() => setHasFailed(true)}
    />
  );
};
