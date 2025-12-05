/**
 * Package TypeScript configuration update logic
 */

import * as path from 'node:path';

import chalk from 'chalk';

import { calculateRelativePath, findSiblingTsconfigs, readTsConfig, writeTsConfig } from './fs-utils.js';
import { getStandardReferencePath } from './package-parser.js';
import { filterReferences, mergeExtraRefs, updateSiblingTsconfigReferences } from './reference-merger.js';
import type { PackageInfo } from './types.js';

/**
 * Update a single package's tsconfig.json with references
 */
export async function updatePackageReferences(
  packageInfo: PackageInfo,
  packageMap: Map<string, PackageInfo>,
  monorepoRoot: string,
  dryRun = false,
  verbose = false
): Promise<number> {
  const { name, tsconfigPath, tsconfigTsserverPath, workspaceDeps, tsconfigConfigs, packageConfig } = packageInfo;

  let mainConfigChanged = false;
  let tsserverConfigChanged = false;
  let siblingUpdateCount = 0;
  const updatedSiblings: string[] = [];

  // Get package-level skip refs
  const packageSkipRefs = packageConfig.skipRefs ?? [];

  // If package has an alter tsconfig, handle the logic based on configuration
  if (tsconfigTsserverPath && packageConfig.useAlterTsconfig) {
    const alterTsconfigName = path.basename(tsconfigTsserverPath);

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
          const targetPath = getStandardReferencePath(depInfo);
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

    // Filter out skipped references
    tsconfigReferences = filterReferences(tsconfigReferences, packageSkipRefs, tsconfigPath);

    // Sort references
    tsconfigReferences.sort((a, b) => a.path.localeCompare(b.path));

    const existingRefs = tsconfig.references ?? [];
    const existingPaths = new Set(existingRefs.map((r) => r.path));
    const newPaths = new Set(tsconfigReferences.map((r) => r.path));

    const tsconfigHasChanges =
      existingRefs.length !== tsconfigReferences.length || !Array.from(newPaths).every((p) => existingPaths.has(p));

    if (tsconfigHasChanges) {
      if (tsconfigReferences.length > 0) {
        tsconfig.references = tsconfigReferences;
      } else {
        delete tsconfig.references;
      }
      if (!dryRun) {
        await writeTsConfig(tsconfigPath, tsconfig);
      }
      mainConfigChanged = true;
    }

    // Update alter tsconfig with all siblings and workspace deps
    const tsserverConfig = await readTsConfig(tsconfigTsserverPath);

    // Find sibling tsconfigs (exclude both tsconfig.json and the alter tsconfig)
    const siblingTsconfigs = await findSiblingTsconfigs(tsconfigTsserverPath, ['tsconfig.json']);

    // Filter out excluded tsconfigs
    const includedSiblings = siblingTsconfigs.filter((sibling) => {
      const siblingPath = path.resolve(path.dirname(tsconfigTsserverPath), sibling);
      const config = tsconfigConfigs.get(siblingPath);
      return !config?.excludeThisTsconfig;
    });

    let tsserverReferences: { path: string }[] = includedSiblings.map((p) => ({ path: p }));

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
        const targetPath = getStandardReferencePath(depInfo);
        const relativePath = calculateRelativePath(tsconfigTsserverPath, targetPath);
        tsserverReferences.push({ path: relativePath });
      } else if (verbose) {
        console.log(chalk.gray(`    ${name}: dependency ${depName} not found in workspace`));
      }
    }

    // Add package-level extra refs to alter tsconfig
    for (const extraRef of packageConfig.extraRefs ?? []) {
      const relativePath = calculateRelativePath(
        tsconfigTsserverPath,
        path.resolve(path.dirname(tsconfigTsserverPath), extraRef.path)
      );
      tsserverReferences.push({ path: relativePath });
    }

    // Filter out skipped references
    tsserverReferences = filterReferences(tsserverReferences, packageSkipRefs, tsconfigTsserverPath);

    // Sort workspace dependency references (after siblings)
    const siblingCount = includedSiblings.length;
    if (tsserverReferences.length > siblingCount) {
      const workspaceRefs = tsserverReferences.slice(siblingCount);
      workspaceRefs.sort((a, b) => a.path.localeCompare(b.path));
      tsserverReferences.splice(siblingCount, workspaceRefs.length, ...workspaceRefs);
    }

    const existingTsserverRefs = tsserverConfig.references ?? [];
    const existingTsserverPaths = new Set(existingTsserverRefs.map((r) => r.path));
    const newTsserverPaths = new Set(tsserverReferences.map((r) => r.path));

    const tsserverHasChanges =
      existingTsserverRefs.length !== tsserverReferences.length ||
      !Array.from(newTsserverPaths).every((p) => existingTsserverPaths.has(p));

    if (tsserverHasChanges) {
      if (tsserverReferences.length > 0) {
        tsserverConfig.references = tsserverReferences;
      } else {
        delete tsserverConfig.references;
      }
      if (!dryRun) {
        await writeTsConfig(tsconfigTsserverPath, tsserverConfig);
      }
      tsserverConfigChanged = true;
    }

    // Update other sibling tsconfig.*.json files with workspace dependencies
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

    // Log changes
    if (mainConfigChanged || tsserverConfigChanged) {
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

      if (tsserverConfigChanged) {
        const refCount = tsserverReferences.length;
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
        const targetPath = getStandardReferencePath(depInfo);
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

    // Filter out skipped references
    references = filterReferences(references, packageSkipRefs, tsconfigPath);

    // Sort workspace dependency references (after siblings)
    const siblingCount = includedSiblings.length;
    if (references.length > siblingCount) {
      const workspaceRefs = references.slice(siblingCount);
      workspaceRefs.sort((a, b) => a.path.localeCompare(b.path));
      references.splice(siblingCount, workspaceRefs.length, ...workspaceRefs);
    }

    const existingRefs = tsconfig.references ?? [];
    const existingPaths = new Set(existingRefs.map((r) => r.path));
    const newPaths = new Set(references.map((r) => r.path));

    const hasChanges =
      existingRefs.length !== references.length || !Array.from(newPaths).every((p) => existingPaths.has(p));

    if (hasChanges) {
      if (references.length > 0) {
        tsconfig.references = references;
      } else {
        delete tsconfig.references;
      }
      if (!dryRun) {
        await writeTsConfig(tsconfigPath, tsconfig);
      }
      mainConfigChanged = true;
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
  if (tsconfigTsserverPath) {
    const tsserverConfig = tsconfigConfigs.get(tsconfigTsserverPath);
    if (tsserverConfig) {
      const tsserverExtraRefsMerged = await mergeExtraRefs(tsconfigTsserverPath, tsserverConfig, name, dryRun, verbose);
      if (tsserverExtraRefsMerged) {
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
      if (!mainConfigChanged && !tsserverConfigChanged) {
        console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name} (sibling tsconfigs only)`));
      }
      console.log(chalk.gray(`    ${dryRun ? '[DRY RUN] ' : ''}Updated ${siblingUpdateCount} sibling tsconfig(s)`));
    }
  }

  // If we only merged extra-refs and nothing else changed, log it
  if (extraRefsMerged && !mainConfigChanged && !tsserverConfigChanged && siblingUpdateCount === 0) {
    console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name} (extra-refs merged)`));
  }

  return mainConfigChanged || tsserverConfigChanged || siblingUpdateCount > 0 || extraRefsMerged ? 1 : 0;
}
