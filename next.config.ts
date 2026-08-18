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

import { getSecurityHeaders } from './lib/observability/security-headers';

const nextConfig: NextConfig = {
  // Required by the production Docker runner, which starts Next's standalone server.
  output: 'standalone',
  async headers() {
    const isHttpsDeployment = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://') ?? false;

    return [
      {
        source: '/(.*)',
        headers: getSecurityHeaders(process.env.NODE_ENV === 'production' && isHttpsDeployment),
      },
    ];
  },
};

export default nextConfig;
