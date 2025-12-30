import type { Rule } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';

type MessageIds = 'noCrossPackageRelativeImport';

const messages: Record<MessageIds, string> = {
  noCrossPackageRelativeImport:
    'Cross-package relative imports are not allowed. Use package name "{{packageName}}" instead.',
};

/**
 * Find the nearest package.json directory for a given file path.
 * Returns the directory containing the package.json, or null if not found.
 */
function findPackageJsonDir(filePath: string): string | null {
  let currentDir = path.dirname(filePath);
  const root = path.parse(currentDir).root;

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
  const resolvedPath = path.resolve(currentFileDir, importPath);

  // Find the package.json for the resolved path
  const targetPackageDir = findPackageJsonDir(resolvedPath);

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
    const currentPackageDir = findPackageJsonDir(filename);

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
