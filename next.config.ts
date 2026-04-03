/**
 * Next.js Framework Configuration
 *
 * Why: This is the orchestrator for our build pipeline and runtime behavior.
 *
 * Optimizations:
 * - Turbopack: Enabled in dev mode via `package.json` for ~10x faster HMR.
 * - Server Components: Utilizes the App Router by default for zero-bundle-size
 *   backend logic.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Docker — bundles only the files needed to run the server
  // into .next/standalone so the image doesn't need node_modules at runtime.
  output: 'standalone',
};

export default nextConfig;
