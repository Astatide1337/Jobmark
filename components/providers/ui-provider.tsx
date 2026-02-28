'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setEnabled(false);
      return;
    }

    if (uiV2 && pathname !== '/') {
      setEnabled(false);
      return;
    }

    setEnabled(true);
  }, [pathname, uiV2]);

  if (!enabled) {
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
