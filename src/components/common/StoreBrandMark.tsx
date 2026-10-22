import React from 'react';
import { StoreImage } from './StoreImage';

interface StoreBrandMarkProps {
  name?: string | null;
  logoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  imageAlt?: string;
}

/** Shared store identity mark with a readable fallback when no logo is configured. */
export const StoreBrandMark: React.FC<StoreBrandMarkProps> = ({
  name,
  logoUrl,
  className = 'h-10 w-10',
  fallbackClassName = 'bg-indigo-600 text-white',
  imageClassName = 'h-full w-full object-contain',
  imageAlt = '',
}) => {
  const cleanName = name?.trim() || 'Store';
  const initial = Array.from(cleanName)[0]?.toLocaleUpperCase() || 'S';
  const cleanLogo = typeof logoUrl === 'string' && /^https:\/\//i.test(logoUrl.trim())
    ? logoUrl.trim()
    : '';

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${className} ${cleanLogo ? 'bg-white' : fallbackClassName}`}>
      {cleanLogo ? (
        <StoreImage
          src={cleanLogo}
          preset="logo"
          alt={imageAlt}
          aria-hidden={imageAlt ? undefined : true}
          className={imageClassName}
        />
      ) : (
        <span aria-hidden="true" className="select-none font-bold leading-none">
          {initial}
        </span>
      )}
    </div>
  );
};
