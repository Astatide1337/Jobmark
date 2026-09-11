import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * ESLint Configuration
 *
 * Note: eslint-plugin-tailwindcss disabled due to Tailwind v4 incompatibility.
 * Tailwind classes are managed by Prettier with prettier-plugin-tailwindcss.
 */

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Console logging - warn on log, allow error/warn/info for debugging
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],

      // File length - warn at 1000 lines (enforces component splitting)
      'max-lines': ['warn', { max: 1000, skipBlankLines: true, skipComments: true }],

      // Function complexity (cyclomatic) - warn at 25 (relaxed for development)
      complexity: ['warn', 25],

      // Max function length - warn at 500 lines (relaxed for development)
      'max-lines-per-function': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],

      // Prevent nested ternary operators for readability - warn only in development
      'no-nested-ternary': 'warn',

      // Unused code makes large client components harder to reason about.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_*',
          varsIgnorePattern: '^_*',
          caughtErrorsIgnorePattern: '^_*',
        },
      ],

      // Keep the domain and UI layers explicitly typed.
      '@typescript-eslint/no-explicit-any': 'error',

      // State synchronization belongs to explicit events or keyed editable
      // drafts. Keeping this as an error prevents hydration flicker from
      // returning when a new client component is added.
      'react-hooks/set-state-in-effect': 'error',

      'react/no-unescaped-entities': 'error',

      // Render functions must remain pure; state changes belong to events/effects.
      'react-hooks/purity': 'error',

      'react-hooks/immutability': 'error',

      '@typescript-eslint/prefer-as-const': 'error',

      '@typescript-eslint/no-empty-object-type': 'error',

      // Keep keyboard and screen-reader paths covered by CI. Next's preset
      // registers these rules as warnings; product interactions must be errors.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.worktrees/**', '*.config.*']),
]);

export default eslintConfig;
