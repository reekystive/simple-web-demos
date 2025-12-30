import type { ESLint, Linter } from 'eslint';
import { noCrossPackageRelativeImport } from './rule.js';

const plugin = {
  meta: {
    name: '@monorepo/eslint-plugin-no-cross-package-relative-import',
    version: '0.0.0',
  },
  rules: {
    'no-cross-package-relative-import': noCrossPackageRelativeImport,
  },
} satisfies ESLint.Plugin;

/**
 * Flat config for recommended settings.
 * Usage in eslint.config.mjs:
 *
 * ```js
 * import noCrossPackageRelativeImport from '@monorepo/eslint-plugin-no-cross-package-relative-import';
 *
 * export default [
 *   noCrossPackageRelativeImport.configs.recommended,
 *   // or manually configure:
 *   {
 *     plugins: {
 *       'no-cross-package-relative-import': noCrossPackageRelativeImport,
 *     },
 *     rules: {
 *       'no-cross-package-relative-import/no-cross-package-relative-import': 'error',
 *     },
 *   },
 * ];
 * ```
 */
const configs = {
  recommended: {
    plugins: {
      'no-cross-package-relative-import': plugin,
    },
    rules: {
      'no-cross-package-relative-import/no-cross-package-relative-import': 'error',
    },
  } satisfies Linter.Config,
};

export default {
  ...plugin,
  configs,
};

export { noCrossPackageRelativeImport };
