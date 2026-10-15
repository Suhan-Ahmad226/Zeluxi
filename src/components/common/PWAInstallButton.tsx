import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'subtle' | 'icon';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If running standalone as installed app, no need to show prompt
  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // If neither installable via standard API nor on iOS, hide
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={handleInstallClick}
          aria-label="Install Zelux App"
          title="Install Zelux Web App"
          className={`p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors ${className}`}
        >
          <Download className="w-4 h-4" />
        </button>
      ) : variant === 'subtle' ? (
        <button
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          <span>Install App</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors active:scale-95 disabled:opacity-50 ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isInstalling ? 'Installing...' : 'Get App'}</span>
        </button>
      )}

      {/* iOS Safari Home Screen Guidance Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 id="ios-install-title" className="font-bold text-sm text-slate-900">
                Install on iPhone or iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Install <strong>Zelux</strong> to your home screen for instantaneous access, fullscreen shopping, and smooth navigation:
            </p>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Step 1: Tap Share</span>
                  <span className="text-slate-500 text-[11px]">Tap the Safari Share button in the toolbar.</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Step 2: Add to Home Screen</span>
                  <span className="text-slate-500 text-[11px]">Scroll down and choose &ldquo;Add to Home Screen&rdquo;.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
