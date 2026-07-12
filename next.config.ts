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
  // Required by the production Docker runner, which starts Next's standalone server.
  output: 'standalone',
};

export default nextConfig;
