import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  MessageCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

type SocialLink = { label: string; href: string; Icon: React.ComponentType<{ className?: string }> };

function safeExternalUrl(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function phoneHref(value?: string): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const safe = normalized.replace(/[^\d+]/g, '');
  return safe.length >= 6 ? `tel:${safe}` : null;
}

export const Footer: React.FC = () => {
  const { settings, setActiveView, setActiveStaticPage } = useStore();
  const storeName = settings.storeName?.trim() || 'Zelux';
  const phone = settings.phone?.trim();
  const email = settings.email?.trim();
  const address = settings.address?.trim();
  const socialLinks: SocialLink[] = [
    { label: 'Facebook', href: settings.facebookUrl || '', Icon: Facebook },
    { label: 'Instagram', href: settings.instagramUrl || '', Icon: Instagram },
    { label: 'TikTok', href: settings.tiktokUrl || '', Icon: Music2 },
    { label: 'YouTube', href: settings.youtubeUrl || '', Icon: Youtube },
    {
      label: 'WhatsApp',
      href: settings.whatsappNumber?.trim()
        ? `https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, '')}`
        : '',
      Icon: MessageCircle,
    },
  ].flatMap((item) => {
    const href = safeExternalUrl(item.href);
    return href ? [{ ...item, href }] : [];
  });

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-slate-300 sm:mt-20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-9 border-b border-white/10 pb-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <section className="space-y-4">
            <a
              href="/"
              aria-label={`${storeName} home`}
              className="inline-flex items-center gap-2 text-white no-underline"
            >
              <span className="text-xl font-black uppercase tracking-[0.16em] sm:text-2xl">{storeName}</span>
              <span className="rounded bg-indigo-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200">Store</span>
            </a>
            <p className="max-w-sm text-sm leading-6 text-slate-400">
              {settings.footerDescription?.trim() || settings.tagline?.trim() || 'Thoughtfully selected essentials for everyday living.'}
            </p>

            <div className="space-y-3 text-sm">
              {settings.showAddressInFooter !== false && address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                  <span className="leading-5 text-slate-300">{address}</span>
                </div>
              )}
              {settings.showPhoneInFooter !== false && phone && (
                <a href={phoneHref(phone) || undefined} className="flex items-center gap-3 text-slate-300 transition-colors hover:text-white">
                  <Phone className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                  <span>{phone}</span>
                </a>
              )}
              {settings.showEmailInFooter !== false && email && (
                <a href={`mailto:${email}`} className="flex items-center gap-3 break-all text-slate-300 transition-colors hover:text-white">
                  <Mail className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                  <span>{email}</span>
                </a>
              )}
            </div>

            {settings.showSocialLinksInFooter !== false && socialLinks.length > 0 && (
              <nav aria-label="Social media" className="flex flex-wrap gap-2 pt-1">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-white"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </nav>
            )}
          </section>

          <nav aria-label="Shop navigation">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Explore</h2>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><button onClick={() => setActiveView('shop')} className="transition hover:text-white">All products</button></li>
              <li><button onClick={() => setActiveView('tracking')} className="transition hover:text-white">Track order</button></li>
              <li><button onClick={() => setActiveView('account')} className="transition hover:text-white">My account</button></li>
              <li><button onClick={() => setActiveStaticPage('about')} className="transition hover:text-white">About us</button></li>
            </ul>
          </nav>

          <nav aria-label="Customer service">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Customer care</h2>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><button onClick={() => setActiveStaticPage('shipping')} className="text-left transition hover:text-white">Shipping policy</button></li>
              <li><button onClick={() => setActiveStaticPage('refund')} className="text-left transition hover:text-white">Returns & refunds</button></li>
              <li><button onClick={() => setActiveStaticPage('faq')} className="text-left transition hover:text-white">Frequently asked questions</button></li>
              <li><button onClick={() => setActiveStaticPage('support')} className="text-left transition hover:text-white">Contact support</button></li>
            </ul>
          </nav>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Payment & delivery</h2>
            <p className="text-sm leading-6 text-slate-400">Secure checkout with available payment methods and reliable delivery options across Bangladesh.</p>
            {settings.showPaymentBadgesInFooter !== false && (
              {(settings.footerPaymentMethods || ['COD']).filter((method) => typeof method === 'string' && method.trim()).length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {(settings.footerPaymentMethods || ['COD']).filter((method) => typeof method === 'string' && method.trim()).slice(0, 8).map((method) => (
                    <span key={method} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200">{method.trim()}</span>
                  ))}
                </div>
              )}
            )}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Keep Zelux close</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">Install the store on your device for quicker access.</p>
              <PWAInstallButton variant="primary" className="mt-3 w-full sm:w-auto" />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {storeName}. {settings.footerCopyright?.trim() || 'All rights reserved.'}</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button onClick={() => setActiveStaticPage('privacy')} className="transition hover:text-slate-300">Privacy policy</button>
            <button onClick={() => setActiveStaticPage('terms')} className="transition hover:text-slate-300">Terms of service</button>
            <a href="/" className="inline-flex items-center gap-1 transition hover:text-slate-300">Back to top <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
