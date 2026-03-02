/**
 * UI State & Smooth Scrolling Provider
 *
 * Why: Handles specialized interface states that don't belong in
 * persistent database settings (like the "v2" UI toggle and Lenis
 * smooth scrolling).
 *
 * Performance:
 * - Mounted Guard: Ensures smooth scrolling only initializes on the
 *   client to prevent hydration mismatches.
 * - Conditional Lenis: Intelligently disables smooth scrolling for
 *   advanced dashboard routes where native scroll performance is preferred.
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ReactLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';

interface UIContextType {
  uiV2: boolean;
  setUiV2: (enabled: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Defaulting to true for our cleanup implementation pass
  const [uiV2, setUiV2] = useState(true);

  return <UIContext.Provider value={{ uiV2, setUiV2 }}>{children}</UIContext.Provider>;
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { uiV2 } = useUI();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if smooth scroll should be enabled
  // 1. Must be mounted (client-side)
  // 2. Must NOT prefer reduced motion
  // 3. Either uiV2 is off, or we are on the landing page
  const isEnabled = useMemo(() => {
    if (!mounted) return false;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return false;

    if (uiV2 && pathname !== '/') return false;

    return true;
  }, [mounted, uiV2, pathname]);

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
