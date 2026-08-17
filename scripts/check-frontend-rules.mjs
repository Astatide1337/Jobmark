import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceRoots = ['app', 'components', 'lib'];
const sourceExtensions = new Set(['.css', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['node_modules', '.next', 'out', 'build']);
const forbiddenPatterns = [
  {
    pattern: /transition-all/,
    message: 'Use a targeted transition property instead of transition-all.',
  },
  {
    pattern: /(?:active|hover):scale(?:-|\[)/,
    message: 'Do not apply scale feedback globally to controls.',
  },
  {
    pattern: /window\.location\.reload\s*\(/,
    message: 'Update local or router state instead of reloading the document.',
  },
  {
    pattern: /maxWidth\.replace\s*\(/,
    message: 'Use a static Tailwind class map or a CSS variable for max width.',
  },
  { pattern: /max-w-\[4xl/, message: 'The malformed max-w-[4xl class must not be reintroduced.' },
];

const landingOnlyPatterns = [
  {
    pattern: /(?:framer-motion|motion\/react|from ['"]lenis)/,
    message: 'The landing page must use CSS motion instead of a second animation/scroll runtime.',
  },
  {
    pattern: /IntersectionObserver|500vh|position:\s*sticky/,
    message: 'The landing page must not reintroduce scroll-driven hidden work.',
  },
];

function collectFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

const violations = [];
for (const sourceRoot of sourceRoots) {
  const rootPath = path.join(repositoryRoot, sourceRoot);
  for (const filePath of collectFiles(rootPath)) {
    const contents = fs.readFileSync(filePath, 'utf8');
    for (const { pattern, message } of forbiddenPatterns) {
      if (!pattern.test(contents)) continue;
      violations.push(`${path.relative(repositoryRoot, filePath)}: ${message}`);
    }

    if (path.relative(repositoryRoot, filePath).startsWith('components/landing/')) {
      for (const { pattern, message } of landingOnlyPatterns) {
        if (pattern.test(contents)) {
          violations.push(`${path.relative(repositoryRoot, filePath)}: ${message}`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Frontend invariant check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.info('Frontend invariant check passed.');
}
