import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

if (process.argv.length !== 2) {
  console.error('This image command only supports: node scripts/run-prisma-migrations.mjs');
  process.exit(2);
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
