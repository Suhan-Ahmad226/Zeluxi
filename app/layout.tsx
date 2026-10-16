import type { Metadata, Viewport } from 'next';
import './site.css';
import { PwaRegister } from './PwaRegister';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Zelux',
  title: {
    default: 'Zelux — Premium Bangladesh Store',
    template: '%s | Zelux',
  },
  description: 'Discover thoughtfully curated lifestyle essentials, leather accessories, apparel and everyday goods from Zelux in Bangladesh.',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Zelux',
    title: 'Zelux — Premium Bangladesh Store',
    description: 'Discover thoughtfully curated lifestyle essentials, leather accessories, apparel and everyday goods from Zelux in Bangladesh.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zelux — Premium Bangladesh Store',
    description: 'Discover thoughtfully curated lifestyle essentials, leather accessories, apparel and everyday goods from Zelux in Bangladesh.',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#FAFAFA] text-[#0F172A] antialiased selection:bg-indigo-500 selection:text-white">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
