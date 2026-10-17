import React from 'react';
import { useStore } from '../../context/StoreContext';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, Music2, MessageCircle } from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

const safeExternalUrl = (value?: string) => {
  const url = value?.trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
};

export const Footer: React.FC = () => {
  const { settings, setActiveView, setActiveStaticPage } = useStore();
  const storeName = settings.storeName?.trim() || 'Zelux';
  const phone = settings.phone?.trim() || '';
  const email = settings.email?.trim() || '';
  const address = settings.address?.trim() || '';
  const tagline = settings.tagline?.trim() || '';
  const phoneHref = phone.replace(/[^\d+]/g, '');
  const whatsappNumber = (settings.footerWhatsAppNumber || '').replace(/\D/g, '');
  const socialLinks = [
    { label: 'Facebook', href: safeExternalUrl(settings.footerFacebookUrl), Icon: Facebook },
    { label: 'Instagram', href: safeExternalUrl(settings.footerInstagramUrl), Icon: Instagram },
    { label: 'TikTok', href: safeExternalUrl(settings.footerTikTokUrl), Icon: Music2 },
    { label: 'YouTube', href: safeExternalUrl(settings.footerYouTubeUrl), Icon: Youtube },
    { label: 'WhatsApp', href: whatsappNumber ? `https://wa.me/${whatsappNumber}` : '', Icon: MessageCircle },
  ].filter((item) => item.href);
  const showContact = settings.footerShowContact !== false;
  const showNavigation = settings.footerShowNavigation !== false;
  const showCustomerCare = settings.footerShowCustomerCare !== false;
  const showPaymentDelivery = settings.footerShowPaymentDelivery !== false;
  const showPwaInstall = settings.footerShowPwaInstall !== false;
  const showSocialLinks = settings.footerShowSocialLinks !== false && socialLinks.length > 0;

  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-slate-300 sm:mt-20">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 sm:pb-8 sm:pt-14 lg:px-8">
        <div className="grid grid-cols-1 gap-9 border-b border-slate-800 pb-9 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-10 lg:pb-10">
          <section className="min-w-0 space-y-4">
            <a href="/" aria-label={`${storeName} home`} className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              <span className="text-2xl font-black uppercase tracking-tight text-white">{storeName}</span>
              <span className="rounded bg-indigo-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">STORE</span>
            </a>
            {tagline && <p className="max-w-xs text-sm leading-6 text-slate-400">{tagline}</p>}

            {showContact && (phone || email || address) && (
              <address className="space-y-3 not-italic text-sm text-slate-400">
                {address && (
                  <div className="flex items-start gap-2.5">
                    <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 break-words">{address}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <a href={`tel:${phoneHref}`} className="break-words transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{phone}</a>
                  </div>
                )}
                {email && (
                  <div className="flex items-start gap-2.5">
                    <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <a href={`mailto:${email}`} className="break-all transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{email}</a>
                  </div>
                )}
              </address>
            )}

            {showSocialLinks && (
              <nav aria-label="Social media" className="flex flex-wrap items-center gap-2 pt-1">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${storeName} on ${label}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </a>
                ))}
              </nav>
            )}
          </section>

          {showNavigation && (
            <nav aria-label="Footer navigation">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Explore</h2>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><button type="button" onClick={() => setActiveView('shop')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">All products</button></li>
                <li><button type="button" onClick={() => setActiveView('tracking')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Track order</button></li>
                <li><button type="button" onClick={() => setActiveView('account')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">My account</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('about')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">About us</button></li>
              </ul>
            </nav>
          )}

          {showCustomerCare && (
            <nav aria-label="Customer care">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white">Customer care</h2>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><button type="button" onClick={() => setActiveStaticPage('shipping')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Shipping policy</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('refund')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Returns & refunds</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('faq')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">FAQs</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('support')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Contact support</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('privacy')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Privacy policy</button></li>
                <li><button type="button" onClick={() => setActiveStaticPage('terms')} className="text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Terms of service</button></li>
              </ul>
            </nav>
          )}

          {showPaymentDelivery && (
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Payment & delivery</h2>
              <p className="text-sm leading-6 text-slate-400">Payment and delivery options available at checkout.</p>
              <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-300" aria-label="Payment and delivery options">
                {['bKash', 'Nagad', 'Rocket', 'Cards', 'Cash on delivery', 'Pathao', 'Steadfast'].map((method) => (
                  <span key={method} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5">{method}</span>
                ))}
              </div>
              {showPwaInstall && (
                <div className="border-t border-slate-800 pt-4">
                  <h3 className="mb-1.5 text-sm font-semibold text-white">Shop on the go</h3>
                  <p className="mb-3 text-sm leading-5 text-slate-400">Install {storeName} on your device for quick access.</p>
                  <PWAInstallButton variant="primary" className="w-full sm:w-auto" />
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-5 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} {(settings.footerCopyrightText || '').trim() || storeName}. All rights reserved.</p>
          {address && <p className="break-words">{address}</p>}
        </div>
      </div>
    </footer>
  );
};
