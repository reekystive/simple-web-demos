/**
 * Package TypeScript configuration update logic
 */

import * as path from 'node:path';

import chalk from 'chalk';

import { calculateRelativePath, findSiblingTsconfigs, readTsConfig, writeTsConfig } from './fs-utils.js';
import { getCanonicalReferencePath } from './package-parser.js';
import { filterReferences, mergeExtraRefs, updateSiblingTsconfigReferences } from './reference-merger.js';
import type { PackageInfo } from './types.js';

/**
 * Build the dependency list for a package, optionally including transitive workspace deps.
 */
function collectWorkspaceDependencies(
  packageInfo: PackageInfo,
  packageMap: Map<string, PackageInfo>,
  includeIndirectDeps: boolean
): string[] {
  if (!includeIndirectDeps) {
    return packageInfo.workspaceDeps;
  }

  const allDeps = new Set<string>();
  const queue = [...packageInfo.workspaceDeps];

  while (queue.length > 0) {
    const depName = queue.shift();
    if (!depName) {
      continue;
    }

    if (depName === packageInfo.name || allDeps.has(depName)) {
      continue;
    }

    allDeps.add(depName);

    const depInfo = packageMap.get(depName);
    if (!depInfo) {
      continue;
    }

    for (const nextDep of depInfo.workspaceDeps) {
      if (!allDeps.has(nextDep) && nextDep !== packageInfo.name) {
        queue.push(nextDep);
      }
    }
  }

  return Array.from(allDeps);
}

/**
 * Update a single package's tsconfig.json with references
 */
export async function updatePackageReferences(
  packageInfo: PackageInfo,
  packageMap: Map<string, PackageInfo>,
  monorepoRoot: string,
  dryRun = false,
  verbose = false,
  includeIndirectDeps = false
): Promise<{ packagesUpdated: number; tsconfigsUpdated: number }> {
  const { name, tsconfigPath, alterTsconfigPath, tsconfigConfigs, packageConfig } = packageInfo;
  const workspaceDeps = collectWorkspaceDependencies(packageInfo, packageMap, includeIndirectDeps);

  let mainConfigChanged = false;
  let alterConfigChanged = false;
  let mainConfigNeedsChange = false;
  let alterConfigNeedsChange = false;
  let siblingUpdateCount = 0;
  const updatedSiblings: string[] = [];

  // Get package-level skip refs
  const packageSkipRefs = packageConfig.skipRefs ?? [];

  // If package has an alter tsconfig, handle the logic based on configuration
  if (alterTsconfigPath && packageConfig.useAlterTsconfig) {
    const alterTsconfigName = path.basename(alterTsconfigPath);

    // Update tsconfig.json based on configuration
    const tsconfig = await readTsConfig(tsconfigPath);
    let tsconfigReferences: { path: string }[] = [];

    if (!packageConfig.skipAddAlterTsconfigToMainTsconfig) {
      // Add reference to alter tsconfig
      tsconfigReferences.push({ path: `./${alterTsconfigName}` });
    }

    if (packageConfig.includeDepsInMainTsconfigIfAlterTsconfigExists) {
      // Add workspace dependencies to main tsconfig
      for (const depName of workspaceDeps) {
        const depInfo = packageMap.get(depName);
        if (depInfo) {
          if (depInfo.packageConfig.excludeThisPackage) {
            if (verbose) {
              console.log(chalk.gray(`    ${name}: skipping dependency ${depName} (excluded by package config)`));
            }
            continue;
          }
          const targetPath = getCanonicalReferencePath(depInfo);
          const relativePath = calculateRelativePath(tsconfigPath, targetPath);
          tsconfigReferences.push({ path: relativePath });
        }
      }
    }

    // Add package-level extra refs to main tsconfig
    for (const extraRef of packageConfig.extraRefs ?? []) {
      const relativePath = calculateRelativePath(tsconfigPath, path.resolve(path.dirname(tsconfigPath), extraRef.path));
      tsconfigReferences.push({ path: relativePath });
    }

    // Add tsconfig-level extra refs to main tsconfig
    const mainTsconfigConfig = tsconfigConfigs.get(tsconfigPath);
    if (mainTsconfigConfig) {
      for (const extraRef of mainTsconfigConfig.extraRefs ?? []) {
        const relativePath = calculateRelativePath(
          tsconfigPath,
          path.resolve(path.dirname(tsconfigPath), extraRef.path)
        );
        tsconfigReferences.push({ path: relativePath });
      }
    }

    // Filter out skipped references
    tsconfigReferences = filterReferences(tsconfigReferences, packageSkipRefs, tsconfigPath);

    const existingRefs = tsconfig.references ?? [];
    const existingPaths = new Set(existingRefs.map((r) => r.path));
    const newPaths = new Set(tsconfigReferences.map((r) => r.path));

    // Check if there are changes by comparing sets (order-independent)
    const tsconfigHasChanges =
      existingRefs.length !== tsconfigReferences.length ||
      !Array.from(newPaths).every((p) => existingPaths.has(p)) ||
      !Array.from(existingPaths).every((p) => newPaths.has(p));

    if (tsconfigHasChanges) {
      mainConfigNeedsChange = true;
      // Only sort when we actually need to update
      tsconfigReferences.sort((a, b) => a.path.localeCompare(b.path));

      if (tsconfigReferences.length > 0) {
        tsconfig.references = tsconfigReferences;
      } else {
        delete tsconfig.references;
      }
      const actuallyChanged = await writeTsConfig(tsconfigPath, tsconfig, false, dryRun);
      mainConfigChanged = actuallyChanged;
    }

    // Update alter tsconfig with all siblings and workspace deps
    const alterConfig = await readTsConfig(alterTsconfigPath);

    // Find sibling tsconfigs (exclude both tsconfig.json and the alter tsconfig)
    const siblingTsconfigs = await findSiblingTsconfigs(alterTsconfigPath, ['tsconfig.json']);

    // Filter out excluded tsconfigs
    const includedSiblings = siblingTsconfigs.filter((sibling) => {
      const siblingPath = path.resolve(path.dirname(alterTsconfigPath), sibling);
      const config = tsconfigConfigs.get(siblingPath);
      return !config?.excludeThisTsconfig;
    });

    let alterReferences: { path: string }[] = includedSiblings.map((p) => ({ path: p }));

    // Add workspace dependencies to alter tsconfig
    for (const depName of workspaceDeps) {
      const depInfo = packageMap.get(depName);
      if (depInfo) {
        if (depInfo.packageConfig.excludeThisPackage) {
          if (verbose) {
            console.log(chalk.gray(`    ${name}: skipping dependency ${depName} (excluded by package config)`));
          }
          continue;
        }
        const targetPath = getCanonicalReferencePath(depInfo);
        const relativePath = calculateRelativePath(alterTsconfigPath, targetPath);
        alterReferences.push({ path: relativePath });
      } else if (verbose) {
        console.log(chalk.gray(`    ${name}: dependency ${depName} not found in workspace`));
      }
    }

    // Add package-level extra refs to alter tsconfig
    for (const extraRef of packageConfig.extraRefs ?? []) {
      const relativePath = calculateRelativePath(
        alterTsconfigPath,
        path.resolve(path.dirname(alterTsconfigPath), extraRef.path)
      );
      alterReferences.push({ path: relativePath });
    }

    // Filter out skipped references
    alterReferences = filterReferences(alterReferences, packageSkipRefs, alterTsconfigPath);

    const existingAlterRefs = alterConfig.references ?? [];
    const existingAlterPaths = new Set(existingAlterRefs.map((r) => r.path));
    const newAlterPaths = new Set(alterReferences.map((r) => r.path));

    // Check if there are changes by comparing sets (order-independent)
    const alterHasChanges =
      existingAlterRefs.length !== alterReferences.length ||
      !Array.from(newAlterPaths).every((p) => existingAlterPaths.has(p)) ||
      !Array.from(existingAlterPaths).every((p) => newAlterPaths.has(p));

    if (alterHasChanges) {
      alterConfigNeedsChange = true;
      // Only sort when we actually need to update
      const siblingCount = includedSiblings.length;
      if (alterReferences.length > siblingCount) {
        const workspaceRefs = alterReferences.slice(siblingCount);
        workspaceRefs.sort((a, b) => a.path.localeCompare(b.path));
        alterReferences.splice(siblingCount, workspaceRefs.length, ...workspaceRefs);
      }

      if (alterReferences.length > 0) {
        alterConfig.references = alterReferences;
      } else {
        delete alterConfig.references;
      }
      const actuallyChanged = await writeTsConfig(alterTsconfigPath, alterConfig, false, dryRun);
      alterConfigChanged = actuallyChanged;
    }

    // Update other sibling tsconfig.*.json files with workspace dependencies
    // Exclude the alter tsconfig since it's already been updated above
    const { tsconfigPaths } = packageInfo;
    const siblingsToUpdate = tsconfigPaths.filter((p) => p !== alterTsconfigPath);

    for (const siblingPath of siblingsToUpdate) {
      const siblingConfig = tsconfigConfigs.get(siblingPath);
      const siblingSkipRefs = [...packageSkipRefs, ...(siblingConfig?.skipRefs ?? [])];

      const updated = await updateSiblingTsconfigReferences(
        siblingPath,
        workspaceDeps,
        packageMap,
        name,
        siblingSkipRefs,
        dryRun,
        verbose
      );
      if (updated) {
        siblingUpdateCount++;
        updatedSiblings.push(path.basename(siblingPath));
      }
    }

    // Log changes
    if (mainConfigChanged || alterConfigChanged) {
      console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name}`));

      if (mainConfigChanged && verbose) {
        if (packageConfig.skipAddAlterTsconfigToMainTsconfig) {
          console.log(chalk.gray(`    tsconfig.json → no reference to ${alterTsconfigName} (skipped by config)`));
        } else {
          console.log(
            chalk.gray(
              `    tsconfig.json → references ${alterTsconfigName}${packageConfig.includeDepsInMainTsconfigIfAlterTsconfigExists ? ' and dependencies' : ''}`
            )
          );
        }
      }

      if (alterConfigChanged) {
        const refCount = alterReferences.length;
        console.log(chalk.gray(`    ${dryRun ? '[DRY RUN] ' : ''}${alterTsconfigName} (${refCount} references)`));
      }
    }
  } else {
    // Original behavior: tsconfig.json gets all siblings and workspace deps
    const tsconfig = await readTsConfig(tsconfigPath);

    // Find sibling tsconfigs
    const siblingTsconfigs = await findSiblingTsconfigs(tsconfigPath);

    // Filter out excluded tsconfigs
    const includedSiblings = siblingTsconfigs.filter((sibling) => {
      const siblingPath = path.resolve(path.dirname(tsconfigPath), sibling);
      const config = tsconfigConfigs.get(siblingPath);
      return !config?.excludeThisTsconfig;
    });

    let references: { path: string }[] = includedSiblings.map((p) => ({
      path: p,
    }));

    // Add workspace dependencies
    for (const depName of workspaceDeps) {
      const depInfo = packageMap.get(depName);
      if (depInfo) {
        if (depInfo.packageConfig.excludeThisPackage) {
          if (verbose) {
            console.log(chalk.gray(`    ${name}: skipping dependency ${depName} (excluded by package config)`));
          }
          continue;
        }
        const targetPath = getCanonicalReferencePath(depInfo);
        const relativePath = calculateRelativePath(tsconfigPath, targetPath);
        references.push({ path: relativePath });
      } else if (verbose) {
        console.log(chalk.gray(`    ${name}: dependency ${depName} not found in workspace`));
      }
    }

    // Add package-level extra refs
    for (const extraRef of packageConfig.extraRefs ?? []) {
      const relativePath = calculateRelativePath(tsconfigPath, path.resolve(path.dirname(tsconfigPath), extraRef.path));
      references.push({ path: relativePath });
    }

    // Add tsconfig-level extra refs
    const mainTsconfigConfig = tsconfigConfigs.get(tsconfigPath);
    if (mainTsconfigConfig) {
      for (const extraRef of mainTsconfigConfig.extraRefs ?? []) {
        const relativePath = calculateRelativePath(
          tsconfigPath,
          path.resolve(path.dirname(tsconfigPath), extraRef.path)
        );
        references.push({ path: relativePath });
      }
    }

    // Filter out skipped references
    references = filterReferences(references, packageSkipRefs, tsconfigPath);

    const existingRefs = tsconfig.references ?? [];
    const existingPaths = new Set(existingRefs.map((r) => r.path));
    const newPaths = new Set(references.map((r) => r.path));

    // Check if there are changes by comparing sets (order-independent)
    const hasChanges =
      existingRefs.length !== references.length ||
      !Array.from(newPaths).every((p) => existingPaths.has(p)) ||
      !Array.from(existingPaths).every((p) => newPaths.has(p));

    if (hasChanges) {
      mainConfigNeedsChange = true;
      // Only sort when we actually need to update
      const siblingCount = includedSiblings.length;
      if (references.length > siblingCount) {
        const workspaceRefs = references.slice(siblingCount);
        workspaceRefs.sort((a, b) => a.path.localeCompare(b.path));
        references.splice(siblingCount, workspaceRefs.length, ...workspaceRefs);
      }

      if (references.length > 0) {
        tsconfig.references = references;
      } else {
        delete tsconfig.references;
      }
      const actuallyChanged = await writeTsConfig(tsconfigPath, tsconfig, false, dryRun);
      mainConfigChanged = actuallyChanged;
    }

    // Update sibling tsconfig.*.json files with workspace dependencies
    const { tsconfigPaths } = packageInfo;
    for (const siblingPath of tsconfigPaths) {
      const siblingConfig = tsconfigConfigs.get(siblingPath);
      const siblingSkipRefs = [...packageSkipRefs, ...(siblingConfig?.skipRefs ?? [])];

      const updated = await updateSiblingTsconfigReferences(
        siblingPath,
        workspaceDeps,
        packageMap,
        name,
        siblingSkipRefs,
        dryRun,
        verbose
      );
      if (updated) {
        siblingUpdateCount++;
        updatedSiblings.push(path.basename(siblingPath));
      }
    }

    if (mainConfigChanged) {
      const relativeTsconfig = path.relative(monorepoRoot, tsconfigPath);
      console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name} (${references.length} references)`));

      if (verbose && references.length > 0) {
        console.log(chalk.gray(`    ${relativeTsconfig}`));
        for (const ref of references) {
          console.log(chalk.gray(`      → ${ref.path}`));
        }
      }
    }
  }

  // Merge extra-refs files for all tsconfig files
  let extraRefsMerged = false;

  // Always merge extra-refs for main tsconfig.json
  if (verbose) {
    console.log(chalk.gray(`    Attempting to merge extra-refs for ${name}...`));
  }

  const mainTsconfigConfig = tsconfigConfigs.get(tsconfigPath);
  if (mainTsconfigConfig) {
    const mainExtraRefsMerged = await mergeExtraRefs(tsconfigPath, mainTsconfigConfig, name, dryRun, verbose);
    if (mainExtraRefsMerged) {
      extraRefsMerged = true;
    }
  }

  // Always merge extra-refs for alter tsconfig if it exists
  if (alterTsconfigPath) {
    const alterConfig = tsconfigConfigs.get(alterTsconfigPath);
    if (alterConfig) {
      const alterExtraRefsMerged = await mergeExtraRefs(alterTsconfigPath, alterConfig, name, dryRun, verbose);
      if (alterExtraRefsMerged) {
        extraRefsMerged = true;
      }
    }
  }

  // Log sibling updates (common for both branches)
  if (siblingUpdateCount > 0) {
    if (verbose) {
      for (const siblingName of updatedSiblings) {
        console.log(chalk.gray(`    ${dryRun ? '[DRY RUN] ' : ''}✓ Updated ${siblingName}`));
      }
    } else {
      if (!mainConfigChanged && !alterConfigChanged) {
        console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name} (sibling tsconfigs only)`));
      }
      console.log(chalk.gray(`    ${dryRun ? '[DRY RUN] ' : ''}Updated ${siblingUpdateCount} sibling tsconfig(s)`));
    }
  }

  // If we only merged extra-refs and nothing else changed, log it
  if (extraRefsMerged && !mainConfigChanged && !alterConfigChanged && siblingUpdateCount === 0) {
    console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name} (extra-refs merged)`));
  }

  const hasAnyChanges = mainConfigNeedsChange || alterConfigNeedsChange || siblingUpdateCount > 0 || extraRefsMerged;
  const tsconfigsUpdated =
    (mainConfigNeedsChange ? 1 : 0) + (alterConfigNeedsChange ? 1 : 0) + siblingUpdateCount + (extraRefsMerged ? 1 : 0);

  return {
    packagesUpdated: hasAnyChanges ? 1 : 0,
    tsconfigsUpdated,
  };
}
