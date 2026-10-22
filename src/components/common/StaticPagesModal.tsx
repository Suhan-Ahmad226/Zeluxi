import React from 'react';
import { useStore } from '../../context/StoreContext';
import { formatDateOnly } from '../../utils/formatters';
import { X, ShieldCheck, Truck, RefreshCw, Mail, FileText } from 'lucide-react';

export type StaticPageType = string;

interface StaticPagesModalProps {
  page: StaticPageType | null;
  onClose: () => void;
}

const builtInPages: Record<string, { title: string; description: string; Icon: React.ComponentType<{ className?: string }> }> = {
  about: { title: 'About Zelux', description: 'Store information has not been configured yet.', Icon: ShieldCheck },
  shipping: { title: 'Shipping & Delivery Policy', description: 'The store owner has not published a shipping policy yet.', Icon: Truck },
  refund: { title: 'Returns & Refunds', description: 'The store owner has not published a returns and refunds policy yet.', Icon: RefreshCw },
  support: { title: 'Contact Support', description: 'Please use the contact details configured by the store owner.', Icon: Mail },
  faq: { title: 'Frequently Asked Questions', description: 'Frequently asked questions have not been published yet.', Icon: FileText },
  privacy: { title: 'Privacy Policy', description: 'The store owner has not published a privacy policy yet.', Icon: FileText },
  terms: { title: 'Terms of Service', description: 'The store owner has not published terms of service yet.', Icon: FileText },
};

export const StaticPagesModal: React.FC<StaticPagesModalProps> = ({ page, onClose }) => {
  const { settings, pages } = useStore();
  if (!page) return null;

  const dynamicPage = pages.find((item) => item.slug === page && item.isPublished);
  const builtIn = builtInPages[page];
  const title = dynamicPage?.title || builtIn?.title || page.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const Icon = builtIn?.Icon || FileText;
  const content = dynamicPage?.content?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="cms-page-title" className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
            <h2 id="cms-page-title" className="truncate text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close page" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5 text-sm leading-7 text-slate-700 sm:p-6">
          {content ? (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          ) : page === 'support' ? (
            <div className="space-y-3">
              <p>{builtIn?.description}</p>
              {settings.phone?.trim() && <p><strong>Phone:</strong> <a className="text-indigo-700 underline" href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>{settings.phone}</a></p>}
              {settings.email?.trim() && <p><strong>Email:</strong> <a className="text-indigo-700 underline" href={`mailto:${settings.email}`}>{settings.email}</a></p>}
              {settings.address?.trim() && <p><strong>Address:</strong> {settings.address}</p>}
              {settings.whatsappNumber?.trim() && <p><strong>WhatsApp:</strong> <a className="text-indigo-700 underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}>Chat with support</a></p>}
              {!settings.phone?.trim() && !settings.email?.trim() && !settings.address?.trim() && !settings.whatsappNumber?.trim() && <p>Contact information has not been configured yet. Please check back later.</p>}
            </div>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{builtIn?.description || 'This page has not been published yet.'} Please check back later.</p>
          )}
          {dynamicPage && <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Last updated: {formatDateOnly(dynamicPage.lastUpdated)}</p>}
        </div>
      </section>
    </div>
  );
};
