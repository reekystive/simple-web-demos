import type { Rule } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';

type MessageIds = 'noCrossPackageRelativeImport';

const messages: Record<MessageIds, string> = {
  noCrossPackageRelativeImport:
    'Cross-package relative imports are not allowed. Use package name "{{packageName}}" instead.',
};

/**
 * Common file extensions for module resolution.
 *
 * Order matters: extensions are tried in sequence when resolving `import './foo'`.
 * More common extensions should come first for performance.
 */
const MODULE_EXTENSIONS = [
  // Standard JavaScript/TypeScript
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  // ES Modules explicit extensions
  '.mjs',
  '.mts',
  '.mjsx',
  '.mtsx',
  // CommonJS explicit extensions
  '.cjs',
  '.cts',
  '.cjsx',
  '.ctsx',
  // Data files
  '.json',
];

/**
 * Resolve a module path following Node.js/bundler-like resolution rules.
 *
 * ## Resolution Priority (matches Node.js behavior)
 *
 * Given `import './pkg'`, resolution order is:
 *
 * 1. **Exact file match**: `./pkg` exists as a file (no extension) → use it
 * 2. **File with extension**: `./pkg.js`, `./pkg.ts`, etc. → use first match
 * 3. **Directory**: `./pkg/` exists as directory → use it (for package.json lookup)
 *
 * ## Edge Case: File and Directory with Same Name
 *
 * When both `./pkg` (directory) and `./pkg.js` (file) exist:
 * - Node.js resolves `import './pkg'` to `./pkg.js` (FILE takes priority)
 * - This function follows the same behavior
 *
 * Example filesystem:
 * ```
 * ./pkg/           <- directory with package.json
 * ./pkg.js         <- file
 * ```
 * `import './pkg'` → resolves to `./pkg.js`, NOT `./pkg/`
 *
 * ## Return Value
 *
 * Returns `{ resolvedPath, isDirectory }`:
 * - `resolvedPath`: The actual path that would be loaded
 * - `isDirectory`: Whether the resolved path is a directory (affects package.json lookup)
 */
function resolveModulePath(basePath: string): { resolvedPath: string; isDirectory: boolean } {
  // Priority 1: Check if exact path exists
  try {
    const stats = fs.statSync(basePath);

    if (stats.isFile()) {
      // Exact file match (e.g., './pkg' is literally a file named 'pkg')
      return { resolvedPath: basePath, isDirectory: false };
    }

    if (stats.isDirectory()) {
      // Path is a directory, but we must check if a file with extension exists
      // Example: './pkg/' exists, but './pkg.js' also exists → use './pkg.js'
      for (const ext of MODULE_EXTENSIONS) {
        const withExt = basePath + ext;
        try {
          const extStats = fs.statSync(withExt);
          if (extStats.isFile()) {
            // File with extension takes priority over directory
            return { resolvedPath: withExt, isDirectory: false };
          }
        } catch {
          // Extension file doesn't exist, continue checking others
        }
      }
      // No file with extension found, use the directory itself
      return { resolvedPath: basePath, isDirectory: true };
    }
  } catch {
    // Path doesn't exist as-is, fall through to try extensions
  }

  // Priority 2: Try adding common extensions
  // Example: './pkg' doesn't exist, try './pkg.js', './pkg.ts', etc.
  for (const ext of MODULE_EXTENSIONS) {
    const withExt = basePath + ext;
    try {
      const stats = fs.statSync(withExt);
      if (stats.isFile()) {
        return { resolvedPath: withExt, isDirectory: false };
      }
    } catch {
      // This extension doesn't exist, try next
    }
  }

  // Priority 3: Path doesn't exist at all
  // This can happen with:
  // - Incorrect import paths (will fail at runtime anyway)
  // - Path aliases (e.g., tsconfig paths, bundler aliases)
  // - Future files not yet created
  //
  // We treat it as a file path (not directory) and let the parent directory
  // lookup find the package.json. This is a safe fallback.
  return { resolvedPath: basePath, isDirectory: false };
}

/**
 * Find the nearest package.json directory by walking up the directory tree.
 *
 * ## Behavior
 *
 * - If `isDirectory` is true: Start searching from `targetPath` itself
 * - If `isDirectory` is false: Start searching from `path.dirname(targetPath)`
 *
 * ## Why `isDirectory` Matters
 *
 * Consider `import '../other-package'` where `other-package/` is a directory:
 *
 * ```
 * packages/
 * ├── current-package/
 * │   └── src/index.js      <- importing from here
 * └── other-package/
 *     └── package.json      <- should find this
 * ```
 *
 * - If we treat `other-package` as a file path:
 *   `path.dirname('other-package')` = `packages/` → misses `other-package/package.json`
 *
 * - If we treat `other-package` as a directory:
 *   Start from `other-package/` → correctly finds `other-package/package.json`
 *
 * @param targetPath - The resolved import path
 * @param isDirectory - Whether the path was resolved as a directory
 * @returns The directory containing the nearest package.json, or null if not found
 */
function findPackageJsonDir(targetPath: string, isDirectory: boolean): string | null {
  // Start point depends on whether the target is a file or directory
  let currentDir = isDirectory ? targetPath : path.dirname(targetPath);

  const root = path.parse(currentDir).root;

  // Walk up the directory tree until we find a package.json or reach the root
  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Get package name from package.json
 */
function getPackageName(packageDir: string): string | null {
  try {
    const packageJsonPath = path.join(packageDir, 'package.json');
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content) as { name?: string };
    return packageJson.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a path is a relative import.
 * Matches:
 * - Paths starting with './' (e.g., './foo', './foo/../../bar')
 * - Paths starting with '../' (e.g., '../foo', '../foo/../../bar')
 * - Exactly '..' (parent directory)
 * - Exactly '.' (current directory)
 */
function isRelativeImport(importPath: string): boolean {
  return importPath === '.' || importPath === '..' || importPath.startsWith('./') || importPath.startsWith('../');
}

/**
 * Check if the resolved import path crosses package boundaries
 */
function crossesPackageBoundary(
  currentFileDir: string,
  importPath: string,
  currentPackageDir: string
): { crosses: boolean; targetPackageDir: string | null } {
  // Resolve the import path relative to the current file
  const basePath = path.resolve(currentFileDir, importPath);

  // Resolve the module path following Node.js-like resolution rules
  const resolved = resolveModulePath(basePath);
  if (!resolved) {
    return { crosses: false, targetPackageDir: null };
  }

  // Find the package.json for the resolved path
  const targetPackageDir = findPackageJsonDir(resolved.resolvedPath, resolved.isDirectory);

  if (!targetPackageDir) {
    return { crosses: false, targetPackageDir: null };
  }

  // If the target package directory is different from the current package directory,
  // it means the import crosses package boundaries
  const crosses = path.normalize(targetPackageDir) !== path.normalize(currentPackageDir);

  return { crosses, targetPackageDir };
}

export const noCrossPackageRelativeImport: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow relative imports that cross package boundaries in a monorepo',
      recommended: true,
    },
    messages,
    schema: [],
  },

  create(context) {
    const filename = context.filename;
    const currentFileDir = path.dirname(filename);
    const currentPackageDir = findPackageJsonDir(filename, false);

    if (!currentPackageDir) {
      // If we can't find a package.json, skip this rule
      return {};
    }

    // Capture in a const to ensure TypeScript knows it's not null in the closure
    const packageDir = currentPackageDir;

    function checkImport(node: Rule.Node, importPath: string) {
      if (!isRelativeImport(importPath)) {
        return;
      }

      const { crosses, targetPackageDir } = crossesPackageBoundary(currentFileDir, importPath, packageDir);

      if (crosses && targetPackageDir) {
        const packageName = getPackageName(targetPackageDir) ?? targetPackageDir;

        context.report({
          node,
          messageId: 'noCrossPackageRelativeImport',
          data: {
            packageName,
          },
        });
      }
    }

    return {
      // Handle ES module imports: import x from '../other-package/file'
      ImportDeclaration(node) {
        if (typeof node.source.value === 'string') {
          checkImport(node, node.source.value);
        }
      },

      // Handle dynamic imports: import('../other-package/file')
      ImportExpression(node) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
          checkImport(node, node.source.value);
        }
      },

      // Handle re-exports: export { x } from '../other-package/file'
      ExportNamedDeclaration(node) {
        if (node.source && typeof node.source.value === 'string') {
          checkImport(node, node.source.value);
        }
      },

      // Handle export all: export * from '../other-package/file'
      ExportAllDeclaration(node) {
        if (typeof node.source.value === 'string') {
          checkImport(node, node.source.value);
        }
      },

      // Handle CommonJS require: require('../other-package/file')
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          checkImport(node, node.arguments[0].value);
        }
      },
    };
  },
};
