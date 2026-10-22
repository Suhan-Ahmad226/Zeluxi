'use client';

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroBanner } from './components/storefront/HeroBanner';
import { TrustBadges } from './components/storefront/TrustBadges';
import { CategoryList } from './components/storefront/CategoryList';
import { ProductGrid } from './components/storefront/ProductGrid';
import { ProductDetailsPage } from './components/storefront/ProductDetailsPage';
import { DealsBanner } from './components/storefront/DealsBanner';
import { ProductModal } from './components/storefront/ProductModal';
import { RecentlyViewedBar } from './components/storefront/RecentlyViewedBar';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { OrderSuccessModal } from './components/checkout/OrderSuccessModal';
import { OrderTrackingView } from './components/tracking/OrderTrackingView';
import { CustomerAccountView } from './components/account/CustomerAccountView';
import { VerifyEmailScreen } from './components/auth/VerifyEmailScreen';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { NotificationToast } from './components/common/NotificationToast';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { SlidersHorizontal } from 'lucide-react';

// Code-split heavy modals and workspace to optimize initial storefront bundle
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const SizeGuideModal = React.lazy(() => import('./components/storefront/SizeGuideModal').then((m) => ({ default: m.SizeGuideModal })));
const ProductCompareModal = React.lazy(() => import('./components/storefront/ProductCompareModal').then((m) => ({ default: m.ProductCompareModal })));
const StaticPagesModal = React.lazy(() => import('./components/common/StaticPagesModal').then((m) => ({ default: m.StaticPagesModal })));
const WhatsAppConcierge = React.lazy(() => import('./components/common/WhatsAppConcierge').then((m) => ({ default: m.WhatsAppConcierge })));

const MainStoreContent: React.FC<{ productSlug?: string }> = ({ productSlug }) => {
  const { activeView, language, compareList, setIsCompareOpen, activeStaticPage, setActiveStaticPage, storefrontCMS } = useStore();

  // Admin Dashboard has its own dedicated sidebar and compact top header
  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs font-mono text-slate-400">Loading admin workspace...</div>}>
          <AdminDashboard />
        </React.Suspense>
        <AuthModal />
        <OrderSuccessModal />
        <NotificationToast />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A] pb-16 md:pb-0">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1">
        {activeView === 'store' && (
          <>
            {storefrontCMS.sectionVisibility.hero && <HeroBanner />}
            {storefrontCMS.sectionVisibility.trustBadges && <TrustBadges />}
            {storefrontCMS.sectionVisibility.categories && <CategoryList />}
            {storefrontCMS.sectionVisibility.featured && (
              <ProductGrid
                title="Featured Collection"
                subtitle="Handcrafted atelier goods"
                limit={4}
                featuredOnly={true}
              />
            )}
            {storefrontCMS.sectionVisibility.deals && <DealsBanner />}
            {storefrontCMS.sectionVisibility.allProducts && (
              <ProductGrid
                title="All Products"
                subtitle="Nationwide home delivery"
              />
            )}
            {storefrontCMS.sectionVisibility.recentlyViewed && <RecentlyViewedBar />}
          </>
        )}

        {activeView === 'shop' && (
          <div className="py-6">
            <ProductGrid
              title="Shop"
              subtitle="Explore curated goods"
            />
            <RecentlyViewedBar />
          </div>
        )}

        {activeView === 'product' && <ProductDetailsPage slug={productSlug || ''} />}

        {activeView === 'tracking' && <OrderTrackingView />}

        {activeView === 'account' && <CustomerAccountView />}

        {activeView === 'verify-email' && <VerifyEmailScreen />}
      </main>

      <Footer />

      {/* Floating Compare Drawer trigger if items are selected */}
      {compareList.length > 0 && (
        <button
          onClick={() => setIsCompareOpen(true)}
          className="fixed bottom-20 left-4 sm:left-auto sm:right-28 md:right-32 z-40 flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-lg transition-transform active:scale-95"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Compare ({compareList.length})</span>
        </button>
      )}

      {/* Global Modals & Drawers */}
      <AuthModal />
      <ProductModal />
      <React.Suspense fallback={null}>
        <SizeGuideModal />
        <ProductCompareModal />
        <WhatsAppConcierge />
        <StaticPagesModal
          page={activeStaticPage}
          onClose={() => setActiveStaticPage(null)}
        />
      </React.Suspense>
      <CartDrawer />
      <CheckoutModal />
      <OrderSuccessModal />
      <NotificationToast />
      <OfflineIndicator />
      <MobileBottomNav />
    </div>
  );
};

export default function App({ initialView = 'store', productSlug }: { initialView?: 'store' | 'shop' | 'tracking' | 'account' | 'admin' | 'about' | 'verify-email' | 'product'; productSlug?: string }) {
  return (
    <AuthProvider>
      <StoreProvider initialView={initialView}>
        <MainStoreContent productSlug={productSlug} />
      </StoreProvider>
    </AuthProvider>
  );
}
