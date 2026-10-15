import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Home, Compass, Package, ShoppingBag, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeView, setActiveView, cart, setIsCartOpen } = useStore();

  // Hide bottom nav when in admin view (admin uses its own drawer/sidebar)
  if (activeView === 'admin') {
    return null;
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    {
      id: 'store',
      label: 'Home',
      icon: Home,
      onClick: () => setActiveView('store'),
      isActive: activeView === 'store',
    },
    {
      id: 'shop',
      label: 'Shop',
      icon: Compass,
      onClick: () => setActiveView('shop'),
      isActive: activeView === 'shop',
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingBag,
      onClick: () => setIsCartOpen(true),
      isActive: false,
      badge: cartCount > 0 ? (cartCount > 9 ? '9+' : cartCount) : null,
    },
    {
      id: 'tracking',
      label: 'Track',
      icon: Package,
      onClick: () => setActiveView('tracking'),
      isActive: activeView === 'tracking',
    },
    {
      id: 'account',
      label: 'Account',
      icon: User,
      onClick: () => setActiveView('account'),
      isActive: activeView === 'account',
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] safe-bottom-nav"
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors relative active:scale-95 ${
                isActive
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-indigo-600 text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[56px] text-center">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
