import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Sparkles } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const { settings, storefrontCMS } = useStore();
  const [dismissed, setDismissed] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const announcement = storefrontCMS?.announcement;
  const isEnabled = announcement?.active !== undefined ? announcement.active : settings.announcementActive;
  const text = announcement?.text || settings.announcementText || 'Complimentary delivery across Bangladesh on orders over ৳3,500 with code FREEDELIVERY';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const textElement = textRef.current;
    if (!viewport || !textElement) return;

    const measure = () => {
      const overflowing = textElement.scrollWidth > viewport.clientWidth + 1;
      setIsOverflowing(overflowing && !reducedMotion);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(textElement);
    return () => observer.disconnect();
  }, [text, reducedMotion, isOverflowing]);

  if (!isEnabled || dismissed) return null;

  // Keep the marquee speed calm and consistent on both small and large screens.
  const textWidth = textRef.current?.scrollWidth ?? 0;
  const durationSeconds = Math.max(12, Math.min(40, textWidth / 28));

  return (
    <div className="relative flex items-center justify-center border-b border-slate-800 bg-slate-900 py-2 pl-4 pr-10 text-xs font-medium text-white">
      <div className="mx-auto flex w-full max-w-4xl min-w-0 items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
        <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
          {isOverflowing ? (
            <div
              className="announcement-marquee-track"
              style={{ animationDuration: `${durationSeconds}s` }}
            >
              <span ref={textRef} className="shrink-0 whitespace-nowrap">{text}</span>
              <span aria-hidden="true" className="shrink-0 whitespace-nowrap">{text}</span>
            </div>
          ) : (
            <span ref={textRef} className="block truncate text-center">{text}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
