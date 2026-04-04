/**
 * Next.js Framework Configuration
 *
 * Why: This is the orchestrator for our build pipeline and runtime behavior.
 *
 * Optimizations:
 * - Turbopack: Enabled in dev mode via `package.json` for ~10x faster HMR.
 * - Server Components: Utilizes the App Router by default for zero-bundle-size
 *   backend logic.
 * - Vercel: Optimized for serverless deployment with automatic edge caching.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No special output mode needed for Vercel — it handles optimization automatically
};

export default nextConfig;
