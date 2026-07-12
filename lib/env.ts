import 'server-only';

const authSecretNames = ['AUTH_SECRET', 'NEXTAUTH_SECRET'] as const;
const MIN_SECRET_LENGTH = 32;

/** Validate configuration required before the server can safely accept traffic. */
export function validateServerEnvironment(): void {
  // Next evaluates route modules while producing the bundle. Runtime secrets
  // must be injected into the deployed process, not copied into build layers.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const required = ['DATABASE_URL', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'];
  const missing = required.filter(name => !process.env[name]);
  const authSecret = authSecretNames.find(name => Boolean(process.env[name]));
  const encryptionSecret = process.env.JOBMARK_ENCRYPTION_KEY || process.env[authSecret ?? ''];

  if (!authSecret) {
    missing.push('AUTH_SECRET or NEXTAUTH_SECRET');
  } else if ((process.env[authSecret]?.length ?? 0) < MIN_SECRET_LENGTH) {
    missing.push(`${authSecret} (minimum ${MIN_SECRET_LENGTH} characters)`);
  }
  if (!encryptionSecret || encryptionSecret.length < MIN_SECRET_LENGTH) {
    missing.push(
      `JOBMARK_ENCRYPTION_KEY or ${authSecret ?? 'AUTH_SECRET'} (minimum ${MIN_SECRET_LENGTH} characters)`
    );
  }

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  }
}
