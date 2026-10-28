import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/formatters';
import { StoreImage } from '../common/StoreImage';
import { Product } from '../../types';
import {
  ShoppingBag,
  Search,
  Heart,
  ShieldCheck,
  X,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Sparkles,
  Flame,
  Truck,
  Layers,
  ArrowRight,
  Home,
  Store,
  PackageSearch,
  UserRound,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const {
    products,
    settings,
    pages,
    cart,
    wishlist,
    activeView,
    setActiveView,
    activeFilterTab,
    setActiveFilterTab,
    setIsCheckoutOpen,
    searchQuery,
    setSearchQuery,
    setSelectedCategoryFilter,
  } = useStore();

  const {
    userProfile,
    isAdmin,
    setIsAuthModalOpen,
    setAuthModalMode,
    logout,
  } = useAuth();

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) => {
        if (!p.published || p.archived) return false;
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, 5);
  }, [searchQuery, products]);

  const handleSelectProduct = (product: Product) => {
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
    const slug = product.slug || product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    router.push(`/products/${encodeURIComponent(slug)}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    if (activeView !== 'shop') {
      setActiveView('shop');
    }
  };

  const handleNavClick = (view: 'store' | 'shop' | 'tracking' | 'account' | 'admin') => {
    setActiveView(view);
    if (view === 'shop') {
      setSelectedCategoryFilter(null);
    }
  };

  const handleTabClick = (tab: 'all' | 'new-arrivals' | 'best-sellers' | 'deals' | 'featured') => {
    setActiveView('shop');
    setSelectedCategoryFilter(null);
    setActiveFilterTab(tab);
  };

  // Adapt mobile navigation to scroll direction, including nested scroll containers.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    let lastPosition = window.scrollY;
    lastScrollYRef.current = lastPosition;

    const handleScroll = (event: Event) => {
      const target = event.target;
      const currentY = target instanceof HTMLElement && target !== document.documentElement && target !== document.body
        ? Math.max(0, target.scrollTop)
        : Math.max(0, window.scrollY);
      const delta = currentY - lastPosition;

      if (!media.matches || currentY < 48 || isMobileSearchOpen || isUserMenuOpen) {
        setIsMobileNavVisible(true);
      } else if (Math.abs(delta) >= 10) {
        setIsMobileNavVisible(delta < 0);
      }

      if (Math.abs(delta) >= 2) {
        lastPosition = currentY;
        lastScrollYRef.current = currentY;
      }
    };

    const handleViewportChange = () => {
      setIsMobileNavVisible(true);
      lastPosition = window.scrollY;
      lastScrollYRef.current = lastPosition;
    };

    // A single capture-phase listener handles both document and nested element scrolling.
    // Registering on window as well can process the same viewport scroll twice and cancel the direction change.
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    media.addEventListener('change', handleViewportChange);
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      media.removeEventListener('change', handleViewportChange);
    };
  }, [isMobileSearchOpen, isUserMenuOpen]);

  // Reserve space for the fixed mobile bottom bar so it never covers page content.
  useEffect(() => {
    const body = document.body;
    const originalPaddingBottom = body.style.paddingBottom;
    const media = window.matchMedia('(max-width: 767px)');
    const updateBottomSpace = () => {
      body.style.paddingBottom = media.matches && activeView !== 'admin'
        ? 'calc(4.25rem + env(safe-area-inset-bottom))'
        : originalPaddingBottom;
    };
    updateBottomSpace();
    media.addEventListener('change', updateBottomSpace);
    return () => {
      media.removeEventListener('change', updateBottomSpace);
      body.style.paddingBottom = originalPaddingBottom;
    };
  }, [activeView]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
    <header className={"sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-200 motion-reduce:transition-none shadow-xs " + (isMobileNavVisible ? "translate-y-0" : "-translate-y-full") + " md:translate-y-0"}>
      {/* Top Primary Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              handleNavClick('store');
              setActiveFilterTab('all');
            }}
            className="flex items-center gap-2 group text-left"
          >
            {settings.logoUrl?.trim().startsWith('https://') && (
              <StoreImage src={settings.logoUrl.trim()} alt="" aria-hidden="true" className="h-9 w-9 sm:h-10 sm:w-10 max-w-10 object-contain shrink-0" loading="eager" decoding="async" preset="logo" />
            )}
            <span className="min-w-0 max-w-[9rem] truncate text-base sm:text-xl font-black tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors uppercase font-mono">
              {settings.storeName?.trim() || 'Store'}
            </span>
            <span className="hidden sm:inline-block text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-slate-900 text-white rounded font-mono">
              BD
            </span>
          </button>
        </div>

        {/* Desktop Central Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, SKU..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-indigo-500 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Instant Search Suggestions Popover */}
            {isSearchFocused && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Suggestions</span>
                  <span className="font-mono">{searchResults.length} found</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No products matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors text-left group"
                      >
                        <StoreImage
                          src={product.images?.[0]}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                          preset="thumbnail"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>{product.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{product.sku}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 tabular-nums">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-indigo-600 text-center transition-colors border-t border-slate-100 flex items-center justify-center gap-1.5"
                >
                  <span>View all results in shop</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Search Trigger */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors md:hidden"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Wishlist Link */}
          <button
            onClick={() => handleNavClick('account')}
            className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors hidden sm:inline-flex"
            aria-label="Wishlist"
          >
            <Heart className="w-4.5 h-4.5" />
            {wishlist.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </button>

          {/* User Auth Section */}
          <div className="relative" ref={userMenuRef}>
            {userProfile ? (
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors border border-slate-200"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono">
                  {userProfile.displayName.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-800 max-w-[80px] sm:max-w-[110px] truncate hidden sm:inline">
                  {userProfile.displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* User Dropdown Menu */}
            {isUserMenuOpen && userProfile && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{userProfile.displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userProfile.email}</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    userProfile.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {userProfile.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    handleNavClick('account');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>My Profile & Orders</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      handleNavClick('admin');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-indigo-600 font-semibold flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    logout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Shopping Cart Bag Button */}
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shadow-sm active:scale-95"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">
              Cart
            </span>
            <span className="tabular-nums font-mono px-1.5 py-0.5 bg-indigo-700 rounded text-[11px] text-white">
              {cartItemCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-100 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
          {searchQuery.trim().length >= 2 && (
            <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-md divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No matching products
                </div>
              ) : (
                searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="w-full flex items-center gap-2.5 p-2 hover:bg-slate-50 text-left"
                  >
                    <StoreImage
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-8 h-8 rounded object-cover bg-slate-100 shrink-0 border border-slate-200"
                      preset="thumbnail"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{product.name}</p>
                      <p className="text-[10px] text-slate-400">{product.category}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {formatPrice(product.price)}
                    </span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full p-2 bg-slate-50 text-[11px] font-semibold text-indigo-600 text-center flex items-center justify-center gap-1"
              >
                <span>View all in shop</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Desktop Secondary Sub-navigation Bar */}
      <div className="hidden md:block border-t border-slate-100 bg-slate-50/70 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <div className="flex items-center gap-6 font-medium text-slate-600">
            <button
              onClick={() => handleTabClick('all')}
              className={`hover:text-slate-900 transition-colors flex items-center gap-1.5 ${
                activeView === 'shop' && activeFilterTab === 'all' ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              <span>All products</span>
            </button>

            <button
              onClick={() => {
                handleNavClick('store');
                const el = document.getElementById('featured-categories-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Categories</span>
            </button>

            <button
              onClick={() => handleTabClick('new-arrivals')}
              className={`hover:text-slate-900 transition-colors flex items-center gap-1.5 ${
                activeView === 'shop' && activeFilterTab === 'new-arrivals' ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>New arrivals</span>
            </button>

            <button
              onClick={() => handleTabClick('featured')}
              className={`hover:text-slate-900 transition-colors ${
                activeView === 'shop' && activeFilterTab === 'featured' ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              <span>Featured</span>
            </button>

            <button
              onClick={() => handleTabClick('best-sellers')}
              className={`hover:text-slate-900 transition-colors ${
                activeView === 'shop' && activeFilterTab === 'best-sellers' ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              <span>Best sellers</span>
            </button>

            <button
              onClick={() => handleTabClick('deals')}
              className={`hover:text-slate-900 transition-colors flex items-center gap-1 text-rose-600 font-semibold ${
                activeView === 'shop' && activeFilterTab === 'deals' ? 'underline' : ''
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Deals</span>
            </button>
            {pages
              .filter((page) => page.isPublished && page.showInHeader === true)
              .sort((left, right) => (left.navigationOrder ?? 100) - (right.navigationOrder ?? 100))
              .slice(0, 4)
              .map((page) => (
                <button
                  key={page.slug}
                  type="button"
                  onClick={() => router.push(`/${encodeURIComponent(page.slug)}`)}
                  className="max-w-36 truncate hover:text-indigo-600 transition-colors"
                  title={page.navigationLabel || page.title}
                >
                  {page.navigationLabel || page.title}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => handleNavClick('tracking')}
              className={`hover:text-indigo-600 transition-colors flex items-center gap-1.5 ${
                activeView === 'tracking' ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Track order</span>
            </button>
          </div>
        </div>
      </div>

    </header>

    {/* Adaptive mobile bottom navigation; only changes the customer-facing mobile navigation. */}
    {activeView !== 'admin' && (
      <nav
        aria-label="Mobile bottom navigation"
        className={"fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none md:hidden " + (isMobileNavVisible ? "translate-y-0" : "translate-y-full")}
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
          <button
            type="button"
            onClick={() => {
              handleNavClick('store');
              setActiveFilterTab('all');
              setIsMobileNavVisible(true);
            }}
            aria-current={activeView === 'store' ? 'page' : undefined}
            className={"flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors " + (activeView === 'store' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900')}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleTabClick('all');
              setIsMobileNavVisible(true);
            }}
            aria-current={activeView === 'shop' ? 'page' : undefined}
            className={"flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors " + (activeView === 'shop' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900')}
          >
            <Store className="h-5 w-5" />
            <span>Shop</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleNavClick('tracking');
              setIsMobileNavVisible(true);
            }}
            aria-current={activeView === 'tracking' ? 'page' : undefined}
            className={"flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors " + (activeView === 'tracking' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900')}
          >
            <PackageSearch className="h-5 w-5" />
            <span>Orders</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleNavClick('account');
              setIsMobileNavVisible(true);
            }}
            aria-current={activeView === 'account' ? 'page' : undefined}
            className={"flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors " + (activeView === 'account' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900')}
          >
            <UserRound className="h-5 w-5" />
            <span>Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCheckoutOpen(true);
              setIsMobileNavVisible(true);
            }}
            aria-label={"Cart, " + cartItemCount + " items"}
            className="relative flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold leading-none text-white">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </span>
            <span>Cart</span>
          </button>
        </div>
      </nav>
    )}
    </>
  );
};
