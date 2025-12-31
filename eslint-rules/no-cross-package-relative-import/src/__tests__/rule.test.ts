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

// Paths within nested package (package-a/packages/nested)
const nestedIndex = path.join(fixturesDir, 'package-a/packages/nested/src/index.js');

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
        // Import pointing to package root directory (should detect @fixtures/package-b)
        {
          code: `import { b } from '../../package-b';`,
          filename: packageAIndex,
          errors: [
            {
              messageId: 'noCrossPackageRelativeImport',
              data: { packageName: '@fixtures/package-b' },
            },
          ],
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

  it('should detect cross-package imports for nested packages', () => {
    ruleTester.run('no-cross-package-relative-import', noCrossPackageRelativeImport, {
      valid: [],
      invalid: [
        // From outer package (package-a/src/) importing into nested package
        // Path: package-a/src/index.js -> ../packages/nested/src/index
        {
          code: `import { nested } from '../packages/nested/src/index';`,
          filename: packageAIndex,
          errors: [
            {
              messageId: 'noCrossPackageRelativeImport',
              data: { packageName: '@fixtures/nested' },
            },
          ],
        },
        // From outer package importing nested package root directory
        {
          code: `import { nested } from '../packages/nested';`,
          filename: packageAIndex,
          errors: [
            {
              messageId: 'noCrossPackageRelativeImport',
              data: { packageName: '@fixtures/nested' },
            },
          ],
        },
        // From nested package importing into outer package
        // Path: package-a/packages/nested/src/index.js -> ../../../src/index
        {
          code: `import { a } from '../../../src/index';`,
          filename: nestedIndex,
          errors: [
            {
              messageId: 'noCrossPackageRelativeImport',
              data: { packageName: '@fixtures/package-a' },
            },
          ],
        },
      ],
    });
  });

  it('should prioritize file over directory when both exist with same name', () => {
    // Fixture structure:
    // package-a/src/
    // ├── pkg.js              <- FILE (same package as index.js)
    // └── pkg/
    //     ├── package.json    <- DIRECTORY with its own package.json (@fixtures/pkg-directory)
    //     └── index.js
    //
    // When importing './pkg', Node.js resolves to './pkg.js' (file takes priority).
    // So this import stays within package-a and should NOT be reported as cross-package.
    ruleTester.run('no-cross-package-relative-import', noCrossPackageRelativeImport, {
      valid: [
        // import './pkg' resolves to './pkg.js' (file), NOT './pkg/' (directory)
        // Therefore it stays within @fixtures/package-a and is valid
        {
          code: `import { pkg } from './pkg';`,
          filename: packageAIndex,
        },
      ],
      invalid: [
        // Explicitly importing the directory's index.js DOES cross package boundary
        {
          code: `import { pkg } from './pkg/index';`,
          filename: packageAIndex,
          errors: [
            {
              messageId: 'noCrossPackageRelativeImport',
              data: { packageName: '@fixtures/pkg-directory' },
            },
          ],
        },
      ],
    });
  });
});
