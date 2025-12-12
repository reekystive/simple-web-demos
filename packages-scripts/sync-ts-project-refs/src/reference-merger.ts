/**
 * TypeScript project reference merging and management
 */

import * as path from 'node:path';

import chalk from 'chalk';

import { calculateRelativePath, readTsConfig, writeTsConfig } from './fs-utils.js';
import { getCanonicalReferencePath } from './package-parser.js';
import type { PackageInfo, TsconfigConfig } from './types.js';

/**
 * Check if a reference should be skipped based on skip-refs configuration
 */
function shouldSkipReference(refPath: string, skipRefs: { path: string }[], fromTsconfigPath: string): boolean {
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
 * Merge extra references from YAML config into a tsconfig file
 */
export async function mergeExtraRefs(
  tsconfigPath: string,
  tsconfigConfig: TsconfigConfig,
  packageName: string,
  dryRun = false,
  verbose = false
): Promise<boolean> {
  const extraRefs = tsconfigConfig.extraRefs ?? [];

  if (extraRefs.length === 0) {
    return false; // No extra references to merge
  }

  try {
    // Read the tsconfig file
    const tsconfig = await readTsConfig(tsconfigPath);
    const existingRefs = tsconfig.references ?? [];

    // Create a set of existing reference paths for quick lookup
    const existingPaths = new Set(existingRefs.map((ref) => ref.path));

    // Find extra references that are not already present
    const newRefs: { path: string }[] = [];
    for (const ref of extraRefs) {
      // Calculate relative path for the extra ref
      const relativePath = calculateRelativePath(tsconfigPath, path.resolve(path.dirname(tsconfigPath), ref.path));
      if (!existingPaths.has(relativePath)) {
        newRefs.push({ path: relativePath });
      }
    }

    // If no new references to add, return false
    if (newRefs.length === 0) {
      return false;
    }

    // Merge: keep existing order and append new refs at the end
    const mergedReferences = [...existingRefs, ...newRefs];

    // Update the tsconfig
    tsconfig.references = mergedReferences;

    let actuallyChanged = true;
    if (!dryRun) {
      actuallyChanged = await writeTsConfig(tsconfigPath, tsconfig);
    }

    if (actuallyChanged) {
      if (verbose) {
        console.log(
          chalk.gray(
            `    ${dryRun ? '[DRY RUN] ' : ''}✓ Merged extra-refs from config (${newRefs.length} new, ${mergedReferences.length} total)`
          )
        );
      }
    }

    return actuallyChanged;
  } catch (error) {
    if (verbose) {
      console.warn(chalk.yellow(`    ⚠ ${packageName}: Failed to merge extra-refs:`), error);
    }
    return false;
  }
}

/**
 * Filter references based on skip-refs configuration
 */
export function filterReferences(
  references: { path: string }[],
  skipRefs: { path: string }[],
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
  skipRefs: { path: string }[] = [],
  extraRefs: { path: string }[] = [],
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
        if (depInfo.packageConfig.excludeThisPackage) {
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
