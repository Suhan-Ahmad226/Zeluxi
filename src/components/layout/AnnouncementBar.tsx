import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Sparkles } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const { settings, storefrontCMS } = useStore();
  const [dismissed, setDismissed] = useState(false);

  const announcement = storefrontCMS?.announcement;
  const isEnabled = announcement?.active !== undefined ? announcement.active : settings.announcementActive;

  if (!isEnabled || dismissed) return null;

  const text = announcement?.text || settings.announcementText || 'Complimentary delivery across Bangladesh on orders over ৳3,500 with code FREEDELIVERY';

  return (
    <div className="relative bg-slate-900 text-white text-xs py-2 px-4 flex items-center justify-center font-medium border-b border-slate-800">
      <div className="flex items-center gap-2 max-w-4xl mx-auto truncate text-center">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">
          {text}
        </span>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
        aria-label="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
