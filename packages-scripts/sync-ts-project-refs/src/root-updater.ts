/**
 * Root tsconfig.json update logic
 */

import * as path from 'node:path';

import { readTsConfig, writeTsConfig } from './fs-utils.js';
import { getCanonicalReferencePath } from './package-parser.js';
import type { PackageInfo } from './types.js';

/**
 * Update root tsconfig.json with all package references
 */
export async function updateRootTsconfig(
  workspaceRoot: string,
  packageMap: Map<string, PackageInfo>,
  dryRun = false
): Promise<boolean> {
  const rootTsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
  const rootTsconfig = await readTsConfig(rootTsconfigPath);
  const rootReferences: { path: string }[] = [];

  // Add all workspace packages
  const packagePaths = Array.from(packageMap.values())
    .filter((info) => !info.packageConfig.excludeThisPackage)
    .map((info) => {
      const targetPath = getCanonicalReferencePath(info);
      let pkgPath = path.relative(workspaceRoot, targetPath);
      if (!pkgPath.startsWith('./') && !pkgPath.startsWith('../')) {
        pkgPath = `./${pkgPath}`;
      }
      return pkgPath;
    })
    .sort();

  for (const pkgPath of packagePaths) {
    rootReferences.push({ path: pkgPath });
  }

  // Check if there are changes
  const existingRefs = rootTsconfig.references ?? [];
  const existingPaths = new Set(existingRefs.map((r) => r.path));
  const newPaths = new Set(rootReferences.map((r) => r.path));

  const hasChanges =
    existingRefs.length !== rootReferences.length ||
    !Array.from(newPaths).every((p) => existingPaths.has(p)) ||
    !Array.from(existingPaths).every((p) => newPaths.has(p));

  if (!hasChanges) {
    return false;
  }

  rootTsconfig.references = rootReferences;

  if (!dryRun) {
    return await writeTsConfig(rootTsconfigPath, rootTsconfig, false);
  }

  return true;
}
