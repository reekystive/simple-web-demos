/**
 * TypeScript project reference merging and management
 */

import * as path from 'node:path';

import chalk from 'chalk';
import { calculateRelativePath, readTsConfig, writeTsConfig } from './fs-utils.js';
import { getCanonicalReferencePath } from './package-parser.js';
import type { PackageInfo, Ref } from './types.js';

/**
 * Check if a reference should be skipped based on skip-refs configuration
 */
function shouldSkipReference(refPath: string, skipRefs: Ref[], fromTsconfigPath: string): boolean {
  for (const skipRef of skipRefs) {
    // Calculate the relative path from the current tsconfig to the skip ref
    const skipRefRelativePath = calculateRelativePath(
      fromTsconfigPath,
      path.resolve(path.dirname(fromTsconfigPath), skipRef.path)
    );
    if (refPath === skipRefRelativePath || refPath === skipRef.path) {
      return true;
    }
  }
  return false;
}

/**
 * Filter references based on skip-refs configuration
 */
export function filterReferences(
  references: { path: string }[],
  skipRefs: Ref[],
  fromTsconfigPath: string
): { path: string }[] {
  return references.filter((ref) => !shouldSkipReference(ref.path, skipRefs, fromTsconfigPath));
}

/**
 * Update a sibling tsconfig.*.json file with workspace dependency references
 */
export async function updateSiblingTsconfigReferences(
  siblingTsconfigPath: string,
  workspaceDeps: string[],
  packageMap: Map<string, PackageInfo>,
  packageName: string,
  skipRefs: Ref[] = [],
  extraRefs: Ref[] = [],
  dryRun = false,
  verbose = false
): Promise<boolean> {
  try {
    const tsconfig = await readTsConfig(siblingTsconfigPath);

    // Build references array for workspace dependencies
    const references: { path: string }[] = [];

    for (const depName of workspaceDeps) {
      const depInfo = packageMap.get(depName);
      if (depInfo) {
        // Skip packages that are excluded
        if (depInfo.packageConfig.exclude) {
          continue;
        }
        // Use canonical tsconfig if available, otherwise tsconfig.json
        const targetPath = getCanonicalReferencePath(depInfo);
        const relativePath = calculateRelativePath(siblingTsconfigPath, targetPath);
        references.push({ path: relativePath });
      }
    }

    // Add extra refs from config
    for (const ref of extraRefs) {
      const relativePath = calculateRelativePath(
        siblingTsconfigPath,
        path.resolve(path.dirname(siblingTsconfigPath), ref.path)
      );
      references.push({ path: relativePath });
    }

    // Filter out skipped references
    const filteredReferences = filterReferences(references, skipRefs, siblingTsconfigPath);

    // Check if there are changes by comparing sets (order-independent)
    const existingRefs = tsconfig.references ?? [];
    const existingPaths = new Set(existingRefs.map((r) => r.path));
    const newPaths = new Set(filteredReferences.map((r) => r.path));

    const hasChanges =
      existingRefs.length !== filteredReferences.length ||
      !Array.from(newPaths).every((p) => existingPaths.has(p)) ||
      !Array.from(existingPaths).every((p) => newPaths.has(p));

    if (!hasChanges) {
      return false;
    }

    // Only sort when we actually need to update
    filteredReferences.sort((a, b) => a.path.localeCompare(b.path));

    // Update references
    if (filteredReferences.length > 0) {
      tsconfig.references = filteredReferences;
    } else {
      delete tsconfig.references;
    }

    if (!dryRun) {
      const actuallyChanged = await writeTsConfig(siblingTsconfigPath, tsconfig);
      return actuallyChanged;
    }

    return true;
  } catch (error) {
    if (verbose) {
      console.warn(
        chalk.yellow(`    ⚠ ${packageName}: Failed to update ${path.basename(siblingTsconfigPath)}:`),
        error
      );
    }
    return false;
  }
}
