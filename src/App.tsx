'use client';

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroBanner } from './components/storefront/HeroBanner';
import { TrustBadges } from './components/storefront/TrustBadges';
import { CategoryList } from './components/storefront/CategoryList';
import { ProductGrid } from './components/storefront/ProductGrid';
import { DealsBanner } from './components/storefront/DealsBanner';
import { RecentlyViewedBar } from './components/storefront/RecentlyViewedBar';
import { NotificationToast } from './components/common/NotificationToast';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { StoreLoadingSkeleton } from './components/common/StoreLoadingSkeleton';
import { SlidersHorizontal } from 'lucide-react';

// Code-split heavy modals and workspace to optimize initial storefront bundle
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
// Load commerce overlays only when first opened; keep them mounted afterwards so
// their form state survives closing/reopening during the same visit.
const AuthModal = React.lazy(() => import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })));
const ProductModal = React.lazy(() => import('./components/storefront/ProductModal').then((m) => ({ default: m.ProductModal })));
const CartDrawer = React.lazy(() => import('./components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer })));
const CheckoutModal = React.lazy(() => import('./components/checkout/CheckoutModal').then((m) => ({ default: m.CheckoutModal })));
const OrderSuccessModal = React.lazy(() => import('./components/checkout/OrderSuccessModal').then((m) => ({ default: m.OrderSuccessModal })));
// Route-specific screens are split out so the initial storefront doesn't download
// account, order-tracking, email-verification, or product-detail code unnecessarily.
const ProductDetailsPage = React.lazy(() => import('./components/storefront/ProductDetailsPage').then((m) => ({ default: m.ProductDetailsPage })));
const OrderTrackingView = React.lazy(() => import('./components/tracking/OrderTrackingView').then((m) => ({ default: m.OrderTrackingView })));
const CustomerAccountView = React.lazy(() => import('./components/account/CustomerAccountView').then((m) => ({ default: m.CustomerAccountView })));
const VerifyEmailScreen = React.lazy(() => import('./components/auth/VerifyEmailScreen').then((m) => ({ default: m.VerifyEmailScreen })));
const SizeGuideModal = React.lazy(() => import('./components/storefront/SizeGuideModal').then((m) => ({ default: m.SizeGuideModal })));
const ProductCompareModal = React.lazy(() => import('./components/storefront/ProductCompareModal').then((m) => ({ default: m.ProductCompareModal })));
const StaticPagesModal = React.lazy(() => import('./components/common/StaticPagesModal').then((m) => ({ default: m.StaticPagesModal })));
const WhatsAppConcierge = React.lazy(() => import('./components/common/WhatsAppConcierge').then((m) => ({ default: m.WhatsAppConcierge })));

const MainStoreContent: React.FC<{ productSlug?: string }> = ({ productSlug }) => {
  const { activeView, language, compareList, isCompareOpen, setIsCompareOpen, isSizeGuideOpen, activeStaticPage, setActiveStaticPage, storefrontCMS, selectedProduct, isCartOpen, isCheckoutOpen, lastCreatedOrder } = useStore();
  const { isAuthModalOpen } = useAuth();
  const [authModalLoaded, setAuthModalLoaded] = React.useState(false);
  const [productModalLoaded, setProductModalLoaded] = React.useState(false);
  const [cartDrawerLoaded, setCartDrawerLoaded] = React.useState(false);
  const [checkoutModalLoaded, setCheckoutModalLoaded] = React.useState(false);
  const [orderSuccessLoaded, setOrderSuccessLoaded] = React.useState(false);
  const [sizeGuideLoaded, setSizeGuideLoaded] = React.useState(false);
  const [compareModalLoaded, setCompareModalLoaded] = React.useState(false);
  const [staticPagesLoaded, setStaticPagesLoaded] = React.useState(false);

  React.useEffect(() => { if (isAuthModalOpen) setAuthModalLoaded(true); }, [isAuthModalOpen]);
  React.useEffect(() => { if (selectedProduct) setProductModalLoaded(true); }, [selectedProduct]);
  React.useEffect(() => { if (isCartOpen) setCartDrawerLoaded(true); }, [isCartOpen]);
  React.useEffect(() => { if (isCheckoutOpen) setCheckoutModalLoaded(true); }, [isCheckoutOpen]);
  React.useEffect(() => { if (lastCreatedOrder) setOrderSuccessLoaded(true); }, [lastCreatedOrder]);
  React.useEffect(() => { if (isSizeGuideOpen) setSizeGuideLoaded(true); }, [isSizeGuideOpen]);
  React.useEffect(() => { if (isCompareOpen) setCompareModalLoaded(true); }, [isCompareOpen]);
  React.useEffect(() => { if (activeStaticPage) setStaticPagesLoaded(true); }, [activeStaticPage]);

  // Admin Dashboard has its own dedicated sidebar and compact top header
  if (activeView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <React.Suspense fallback={<StoreLoadingSkeleton variant="admin" />} >
          <AdminDashboard />
        </React.Suspense>
        <React.Suspense fallback={null}>
          {authModalLoaded && <AuthModal />}
          {orderSuccessLoaded && <OrderSuccessModal />}
        </React.Suspense>
        <NotificationToast />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A]">
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

        {activeView === 'product' && <React.Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}><ProductDetailsPage slug={productSlug || ''} /></React.Suspense>}

        {activeView === 'tracking' && <React.Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}><OrderTrackingView /></React.Suspense>}

        {activeView === 'account' && <React.Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}><CustomerAccountView /></React.Suspense>}

        {activeView === 'verify-email' && <React.Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}><VerifyEmailScreen /></React.Suspense>}
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
      <React.Suspense fallback={null}>
        {authModalLoaded && <AuthModal />}
        {productModalLoaded && <ProductModal />}
        {cartDrawerLoaded && <CartDrawer />}
        {checkoutModalLoaded && <CheckoutModal />}
        {orderSuccessLoaded && <OrderSuccessModal />}
        {sizeGuideLoaded && <SizeGuideModal />}
        {compareModalLoaded && <ProductCompareModal />}
        <WhatsAppConcierge />
        {staticPagesLoaded && <StaticPagesModal page={activeStaticPage} onClose={() => setActiveStaticPage(null)} />}
      </React.Suspense>
      <NotificationToast />
      <OfflineIndicator />
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
