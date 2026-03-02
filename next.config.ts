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

const nextConfig: NextConfig = {};

export default nextConfig;
