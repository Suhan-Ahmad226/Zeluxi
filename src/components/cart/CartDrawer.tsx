'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../context/StoreContext';

/**
 * Legacy compatibility shim.
 * Cart content now lives on the unified /checkout page; never render the old drawer.
 */
export const CartDrawer: React.FC = () => {
  const router = useRouter();
  const { isCartOpen, setIsCartOpen } = useStore();

  useEffect(() => {
    if (!isCartOpen) return;
    setIsCartOpen(false);
    router.push('/checkout');
  }, [isCartOpen, router, setIsCartOpen]);

  return null;
};
