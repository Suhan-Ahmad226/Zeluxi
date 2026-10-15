import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-18 md:bottom-6 left-4 z-50 flex items-center gap-2 bg-amber-600 text-white px-3.5 py-2 rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-bottom duration-200"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Showing cached catalogue</span>
    </div>
  );
};
