import 'server-only';

const encryptionSecretNames = ['JOBMARK_ENCRYPTION_KEY', 'AUTH_SECRET', 'NEXTAUTH_SECRET'] as const;

/** Validate configuration required before the server can safely accept traffic. */
export function validateServerEnvironment(): void {
  // Next evaluates route modules while producing the bundle. Runtime secrets
  // must be injected into the deployed process, not copied into build layers.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const required = ['DATABASE_URL', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'];
  const missing = required.filter(name => !process.env[name]);
  const hasEncryptionSecret = encryptionSecretNames.some(name => Boolean(process.env[name]));

  if (!hasEncryptionSecret) {
    missing.push('AUTH_SECRET or JOBMARK_ENCRYPTION_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  }
}
