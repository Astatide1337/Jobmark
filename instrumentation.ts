/** Run server configuration checks once when the Node.js runtime starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { validateServerEnvironment } = await import('./lib/env');
    validateServerEnvironment();
  } catch (error) {
    console.error('Server configuration validation failed:', error);
    const nodeProcess = (
      globalThis as typeof globalThis & { process?: { exit(code?: number): never } }
    ).process;
    if (nodeProcess) nodeProcess.exit(1);
    throw error;
  }
}
