/**
 * Root tsconfig.json update logic
 */

import * as path from 'node:path';

import { calculateRelativePath, findSiblingTsconfigs, readTsConfig, writeTsConfig } from './fs-utils.js';
import { getCanonicalReferencePath } from './package-parser.js';
import { filterReferences } from './reference-merger.js';
import type { PackageInfo, RootConfig } from './types.js';

/**
 * Update root solution tsconfig with package references.
 *
 * Notes:
 * - Global scanning filters are applied before packageMap is built.
 * - rootSolution.references.add/skip apply ONLY to this root solution file.
 */
export async function updateRootTsconfig(
  workspaceRoot: string,
  packageMap: Map<string, PackageInfo>,
  rootConfig: RootConfig,
  dryRun = false,
  excludedTsconfigs?: Set<string>
): Promise<boolean> {
  const solutionTsconfigPath = rootConfig.rootSolution.tsconfigPath;
  const rootTsconfigPath = path.isAbsolute(solutionTsconfigPath)
    ? solutionTsconfigPath
    : path.resolve(workspaceRoot, solutionTsconfigPath);
  const rootTsconfig = await readTsConfig(rootTsconfigPath);
  const rootReferences: { path: string }[] = [];

  // Sibling tsconfig.*.json files (discovery)
  if (rootConfig.rootSolution.includeSiblings) {
    const siblings = await findSiblingTsconfigs(rootTsconfigPath);
    for (const rel of siblings) {
      const abs = path.resolve(path.dirname(rootTsconfigPath), rel);
      if (excludedTsconfigs?.has(abs)) {
        continue;
      }
      rootReferences.push({ path: rel });
    }
  }

  // Add all workspace packages
  const packagePaths = Array.from(packageMap.values())
    .filter((info) => !info.packageConfig.exclude)
    .map((info) => {
      const targetPath = getCanonicalReferencePath(info);
      return calculateRelativePath(rootTsconfigPath, targetPath);
    })
    .sort();

  for (const pkgPath of packagePaths) {
    rootReferences.push({ path: pkgPath });
  }

  // rootSolution references.add
  for (const extraRef of rootConfig.rootSolution.references.add) {
    rootReferences.push({
      path: calculateRelativePath(rootTsconfigPath, path.resolve(path.dirname(rootTsconfigPath), extraRef.path)),
    });
  }

  // rootSolution references.skip
  const filtered = filterReferences(rootReferences, rootConfig.rootSolution.references.skip, rootTsconfigPath);
  filtered.sort((a, b) => a.path.localeCompare(b.path));

  // Check if there are changes
  const existingRefs = rootTsconfig.references ?? [];
  const existingPaths = new Set(existingRefs.map((r) => r.path));
  const newPaths = new Set(filtered.map((r) => r.path));

  const hasChanges =
    existingRefs.length !== filtered.length ||
    !Array.from(newPaths).every((p) => existingPaths.has(p)) ||
    !Array.from(existingPaths).every((p) => newPaths.has(p));

  if (!hasChanges) {
    return false;
  }

  if (filtered.length > 0) {
    rootTsconfig.references = filtered;
  } else {
    delete rootTsconfig.references;
  }

  return await writeTsConfig(rootTsconfigPath, rootTsconfig, true, dryRun);
}
