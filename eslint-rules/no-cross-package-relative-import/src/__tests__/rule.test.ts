import { RuleTester } from 'eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';
import { noCrossPackageRelativeImport } from '../rule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '__fixtures__');

// Paths within package-a
const packageAIndex = path.join(fixturesDir, 'package-a/src/index.js');
const packageAHelper = path.join(fixturesDir, 'package-a/src/utils/helper.js');

const ruleTester = new RuleTester();

describe('no-cross-package-relative-import', () => {
  it('should allow relative imports within the same package', () => {
    ruleTester.run('no-cross-package-relative-import', noCrossPackageRelativeImport, {
      valid: [
        // Import from same directory
        {
          code: `import { helper } from './utils/helper';`,
          filename: packageAIndex,
        },
        // Import from parent directory (still within same package)
        {
          code: `import { a } from '../index';`,
          filename: packageAHelper,
        },
        // Absolute package imports (not relative, should be ignored)
        {
          code: `import { foo } from '@fixtures/package-b';`,
          filename: packageAIndex,
        },
        {
          code: `import { foo } from 'lodash';`,
          filename: packageAIndex,
        },
        // Node built-in modules
        {
          code: `import path from 'node:path';`,
          filename: packageAIndex,
        },
      ],
      invalid: [],
    });
  });

  it('should report cross-package relative imports', () => {
    ruleTester.run('no-cross-package-relative-import', noCrossPackageRelativeImport, {
      valid: [],
      invalid: [
        // Import from package-a to package-b using relative path
        {
          code: `import { b } from '../../package-b/src/index';`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
        // Import using .. only
        {
          code: `import { b } from '../../package-b/src';`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
        // Complex relative path that crosses boundary
        {
          code: `import { b } from './utils/../../../../package-b/src/index';`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
        // Dynamic import crossing package boundary
        {
          code: `const b = import('../../package-b/src/index');`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
        // Re-export crossing package boundary
        {
          code: `export { b } from '../../package-b/src/index';`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
        // Export all crossing package boundary
        {
          code: `export * from '../../package-b/src/index';`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
      ],
    });
  });

  it('should handle require() calls', () => {
    ruleTester.run('no-cross-package-relative-import', noCrossPackageRelativeImport, {
      valid: [
        // Require within same package
        {
          code: `const helper = require('./utils/helper');`,
          filename: packageAIndex,
        },
      ],
      invalid: [
        // Require crossing package boundary
        {
          code: `const b = require('../../package-b/src/index');`,
          filename: packageAIndex,
          errors: [{ messageId: 'noCrossPackageRelativeImport' }],
        },
      ],
    });
  });
});
