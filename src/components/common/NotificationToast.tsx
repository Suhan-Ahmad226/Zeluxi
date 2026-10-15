import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { toast, dismissToast } = useStore();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
          isSuccess
            ? 'bg-slate-900 text-white border-slate-800'
            : isError
            ? 'bg-red-950 text-red-100 border-red-800'
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {isError && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-500 shrink-0" />}

        <div className="flex-1">
          <p>{toast.message}</p>
        </div>

        <button
          onClick={dismissToast}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
