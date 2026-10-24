'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import { StoreProvider } from '@/src/context/StoreContext';
import { AnnouncementBar } from '@/src/components/layout/AnnouncementBar';
import { Navbar } from '@/src/components/layout/Navbar';
import { Footer } from '@/src/components/layout/Footer';

export function CmsPageShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <StoreProvider initialView="store">
        <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A]">
          <AnnouncementBar />
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </StoreProvider>
    </AuthProvider>
  );
}
