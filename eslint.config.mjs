import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
      "no-console": ["warn", { allow: ["error", "warn", "info"] }],

      // File length - warn at 1000 lines (enforces component splitting)
      "max-lines": [
        "warn",
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],

      // Function complexity (cyclomatic) - warn at 25 (relaxed for development)
      complexity: ["warn", 25],

      // Max function length - warn at 500 lines (relaxed for development)
      "max-lines-per-function": [
        "warn",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],

      // Prevent nested ternary operators for readability - warn only in development
      "no-nested-ternary": "warn",

      // Prevent unused variables (allows _ prefix for intentional unused)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_*",
          varsIgnorePattern: "^_*",
          caughtErrorsIgnorePattern: "^_*",
        },
      ],

      // Allow any type in development
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow setState in effects for development (common pattern)
      "react-hooks/set-state-in-effect": "warn",

      // Allow unescaped entities in JSX (common for quotes)
      "react/no-unescaped-entities": "warn",

      // Allow impure functions in development
      "react-hooks/purity": "warn",

      // Allow reassign variables in development
      "react-hooks/immutability": "warn",

      // Prefer const - warn only
      "@typescript-eslint/prefer-as-const": "warn",

      // Empty object type - warn
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".worktrees/**",
    "*.config.*",
  ]),
]);

export default eslintConfig;
