"use client";

import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUI } from "./ui-provider";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { uiV2 } = useUI();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // Disable smooth scroll if:
    // 1. Reduced motion is preferred
    // 2. We are in the authenticated app (uiV2 enabled and not landing page)
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      setEnabled(false);
      return;
    }

    if (uiV2 && pathname !== "/") {
      setEnabled(false);
      return;
    }

    setEnabled(true);
  }, [pathname, uiV2]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
