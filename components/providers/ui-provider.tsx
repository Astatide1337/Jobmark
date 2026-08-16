/**
 * UI State & Smooth Scrolling Provider
 *
 * Why: Handles specialized interface states that don't belong in
 * persistent database settings (like the "v2" UI toggle and Lenis
 * smooth scrolling).
 *
 * Performance:
 * - Stable Provider: Keeps the Lenis shell mounted so enabling smooth
 *   scrolling cannot remount the page and replay in-view animations.
 * - Conditional Lenis: Intelligently disables smooth scrolling for
 *   advanced dashboard routes where native scroll performance is preferred.
 */
'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  // Keep the provider mounted while toggling Lenis itself. Conditionally
  // wrapping children here would remount the landing page and replay every
  // scroll-triggered animation.
  const isEnabled = useMemo(() => {
    if (prefersReducedMotion) return false;

    if (uiV2 && pathname !== '/') return false;

    return true;
  }, [pathname, prefersReducedMotion, uiV2]);

  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        autoRaf: isEnabled,
        smoothWheel: isEnabled,
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
