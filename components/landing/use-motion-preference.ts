'use client';

import { useEffect, useState } from 'react';

/**
 * Read the user's motion preference after hydration.
 *
 * Why: SSR cannot know the browser media query. Starting with `null` keeps the
 * server render and the first client render identical, avoiding hydration
 * mismatches in Motion props while the preference is resolved.
 */
export function useMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}
