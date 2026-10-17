'use client';

import React, { useEffect, useState } from 'react';

const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23f1f5f9%22/%3E%3Cpath d=%22M112 214l58-68 38 42 31-35 50 61z%22 fill=%22%23cbd5e1%22/%3E%3Ccircle cx=%22165%22 cy=%22104%22 r=%2220%22 fill=%22%23cbd5e1%22/%3E%3C/svg%3E';

type StoreImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'onError'> & {
  src?: string | null;
  srcSet?: string;
  fallbackSrc?: string;
};

/** Consistent image handling for storefront and admin previews: empty/unsafe URLs and broken remote assets never leave a broken-image icon. */
export const StoreImage: React.FC<StoreImageProps> = ({
  src,
  srcSet,
  fallbackSrc = FALLBACK_IMAGE,
  alt = '',
  ...props
}) => {
  const [hasFailed, setHasFailed] = useState(false);
  const candidate = typeof src === 'string' ? src.trim() : '';
  const isSafeImageSource =
    candidate.startsWith('/') && !candidate.startsWith('//') ||
    /^https?:\/\//i.test(candidate) ||
    /^data:image\/(?:png|jpe?g|webp|avif|gif);base64,/i.test(candidate);
  const resolvedSource = isSafeImageSource ? candidate : fallbackSrc;

  useEffect(() => {
    setHasFailed(false);
  }, [candidate, srcSet]);

  return (
    <img
      {...props}
      src={hasFailed ? fallbackSrc : resolvedSource}
      srcSet={hasFailed || !isSafeImageSource ? undefined : srcSet}
      alt={alt}
      onError={() => setHasFailed(true)}
    />
  );
};
