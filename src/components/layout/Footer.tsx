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
import { StoreImage } from '../common/StoreImage';

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
  return safe.replace(/\D/g, '').length >= 6 ? `tel:${safe}` : null;
}

export const Footer: React.FC = () => {
  const { settings, pages, setActiveView, setActiveStaticPage } = useStore();
  const storeName = settings.storeName?.trim() || 'Zelux';
  const phone = settings.phone?.trim() || '';
  const email = settings.email?.trim() || '';
  const address = settings.address?.trim() || '';
  const phoneLink = phoneHref(phone);
  const whatsappDigits = (settings.whatsappNumber || '').replace(/\D/g, '');
  const socialLinks: SocialLink[] = [
    { label: 'Facebook', href: settings.facebookUrl || '', Icon: Facebook },
    { label: 'Instagram', href: settings.instagramUrl || '', Icon: Instagram },
    { label: 'TikTok', href: settings.tiktokUrl || '', Icon: Music2 },
    { label: 'YouTube', href: settings.youtubeUrl || '', Icon: Youtube },
    { label: 'WhatsApp', href: whatsappDigits.length >= 8 ? `https://wa.me/${whatsappDigits}` : '', Icon: MessageCircle },
  ].flatMap((item) => {
    const href = safeExternalUrl(item.href);
    return href ? [{ ...item, href }] : [];
  });

  const showContact = settings.footerShowContact !== false;
  const showNavigation = settings.footerShowNavigation !== false;
  const showCustomerCare = settings.footerShowCustomerCare !== false;
  const showPaymentDelivery = settings.footerShowPaymentDelivery !== false;
  const showPwaInstall = settings.footerShowPwaInstall !== false;
  const showPaymentBadges = settings.showPaymentBadgesInFooter !== false;

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-slate-300 sm:mt-20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-9 border-b border-white/10 pb-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <section className="min-w-0 space-y-4">
            <a href="/" aria-label={`${storeName} home`} className="inline-flex min-w-0 items-center gap-2 rounded-sm text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              {settings.logoUrl?.trim().startsWith('https://') && (
                <StoreImage src={settings.logoUrl.trim()} alt="" aria-hidden="true" loading="lazy" className="h-9 w-9 max-w-9 shrink-0 object-contain" preset="logo" />
              )}
              <span className="min-w-0 break-words text-xl font-black uppercase tracking-[0.12em] sm:text-2xl">{storeName}</span>
            </a>
            <p className="max-w-sm break-words text-sm leading-6 text-slate-400">
              {settings.footerDescription?.trim() || settings.tagline?.trim() || ''}
            </p>

            {showContact && (address || phone || email) && (
              <address className="space-y-3 text-sm not-italic">
                {address && settings.showAddressInFooter !== false && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                    <span className="min-w-0 break-words leading-5 text-slate-300">{address}</span>
                  </div>
                )}
                {phone && settings.showPhoneInFooter !== false && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                    {phoneLink
                      ? <a href={phoneLink} className="break-words text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{phone}</a>
                      : <span className="break-words text-slate-300">{phone}</span>}
                  </div>
                )}
                {email && settings.showEmailInFooter !== false && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                    <a href={`mailto:${email}`} className="break-all text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{email}</a>
                  </div>
                )}
              </address>
            )}

            {settings.showSocialLinksInFooter !== false && socialLinks.length > 0 && (
              <nav aria-label="Social media" className="flex flex-wrap gap-2 pt-1">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${storeName} on ${label}`} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </nav>
            )}
          </section>

          {showNavigation && (
            <nav aria-label="Shop navigation">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Explore</h2>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><button type="button" onClick={() => setActiveView('shop')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">All products</button></li>
                <li><button type="button" onClick={() => setActiveView('tracking')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Track order</button></li>
                <li><button type="button" onClick={() => setActiveView('account')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">My account</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('about')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">About us</button></li>
              </ul>
            </nav>
          )}

          {showCustomerCare && (
            <nav aria-label="Customer service">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Customer care</h2>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><button type="button" onClick={() => setActiveStaticPage('shipping')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Shipping policy</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('refund')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Returns & refunds</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('faq')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Frequently asked questions</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('support')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Contact support</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('privacy')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Privacy policy</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('terms')} className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Terms of service</button></li>
                {pages
                  .filter((page) => page.isPublished && page.showInFooter === true && !['about', 'shipping', 'refund', 'support', 'faq', 'privacy', 'terms'].includes(page.slug))
                  .sort((a, b) => (a.navigationOrder ?? 100) - (b.navigationOrder ?? 100))
                  .map((page) => (
                    <li key={page.slug}>
                      <button
                        type="button"
                        onClick={() => setActiveStaticPage(page.slug)}
                        className="text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        {page.navigationLabel?.trim() || page.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </nav>
          )}

          {showPaymentDelivery && (
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Payment & delivery</h2>
              <p className="text-sm leading-6 text-slate-400">See the payment methods and delivery options available at checkout.</p>
              {showPaymentBadges && (
                <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Payment methods">
                  {(settings.footerPaymentMethods || ['Cash on delivery']).filter((method) => typeof method === 'string' && method.trim()).slice(0, 8).map((method) => (
                    <span key={method} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200">{method.trim()}</span>
                  ))}
                </div>
              )}
              {showPwaInstall && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="text-sm font-semibold text-white">Keep {storeName} close</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Install the store on your device for quicker access.</p>
                  <PWAInstallButton variant="primary" className="mt-3 w-full sm:w-auto" />
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {storeName}. {settings.footerCopyright?.trim() || 'All rights reserved.'}</p>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href="/" className="inline-flex items-center gap-1 transition hover:text-slate-300">Back to top <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
