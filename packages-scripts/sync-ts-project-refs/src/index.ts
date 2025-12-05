#!/usr/bin/env tsx

/**
 * Sync TypeScript Project References
 *
 * Automatically add TypeScript project references to all packages based on their workspace dependencies.
 * Reads package.json dependencies and generates corresponding references in tsconfig.json.
 *
 * Supports advanced configuration via YAML files:
 * - tsconfig.stspr-package.yaml: Package-level configuration
 * - tsconfig.stspr.yaml: TypeScript config-level configuration
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import chalk from 'chalk';
import { $ } from 'zx';

import { parseWorkspace } from './config-reader.js';
import { CONFIG } from './config.js';
import { findAllPackageJsons, findSiblingTsconfigs, readTsConfig, writeTsConfig } from './fs-utils.js';
import { buildPackageMap, getStandardReferencePath } from './package-parser.js';
import { updatePackageReferences } from './package-updater.js';

$.verbose = false;

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run') || args.includes('-d');
const verbose = args.includes('--verbose') || args.includes('-v');

// Show help message
if (showHelp) {
  console.log(`
${chalk.bold.blue('sync-ts-project-refs')}

${chalk.bold('Description:')}
  Automatically add TypeScript project references to all packages based on their workspace dependencies.
  Reads package.json dependencies and generates corresponding references in tsconfig.json.

${chalk.bold('Usage:')}
  tsx scripts/monorepo/sync-ts-project-refs [options]

${chalk.bold('Options:')}
  --dry-run, -d             Preview changes without modifying files
  --verbose, -v             Show detailed information
  --help, -h                Show this help message

${chalk.bold('Examples:')}
  # Preview what would be changed
  tsx scripts/monorepo/sync-ts-project-refs --dry-run

  # Apply changes to all packages
  tsx scripts/monorepo/sync-ts-project-refs

  # Apply changes with verbose output
  tsx scripts/monorepo/sync-ts-project-refs --verbose

${chalk.bold('Configuration:')}
  The tool supports advanced configuration via YAML files:

  ${chalk.bold('tsconfig.stspr-package.yaml')} (Package-level configuration):
  - use-alter-tsconfig: Use an alternative main tsconfig
  - alter-tsconfig-path: Path to the alternative tsconfig
  - skip-add-alter-tsconfig-to-main-tsconfig: Skip adding alter tsconfig to main
  - include-deps-in-main-tsconfig-if-using-alter-tsconfig: Include deps in main when using alter
  - exclude-this-package: Exclude this package from reference graph
  - skip-deps/skip-dev-deps/skip-optional-deps: Control dependency scanning
  - extra-refs: Package-level extra references
  - skip-refs: Package-level references to skip

  ${chalk.bold('tsconfig.stspr.yaml')} (TypeScript config-level configuration):
  - exclude-this-tsconfig: Exclude this specific tsconfig
  - extra-refs: Config-level extra references
  - skip-refs: Config-level references to skip

${chalk.bold('Output:')}
  - Lists all packages being processed
  - Shows which references are added to each package
  - Reports statistics on changes made
`);
  process.exit(0);
}

console.log(chalk.blue('🔧 Adding TypeScript project references...\n'));
console.log(chalk.gray(`Root directory: ${CONFIG.MONOREPO_ROOT}\n`));

if (dryRun) {
  console.log(chalk.yellow('🔍 DRY RUN MODE - No files will be modified\n'));
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Parse workspace configuration
  console.log(chalk.blue('📦 Parsing workspace configuration...'));
  const { includePatterns, excludePatterns } = await parseWorkspace(CONFIG.MONOREPO_ROOT);
  if (verbose) {
    console.log(chalk.gray(`  Include patterns: ${includePatterns.join(', ')}`));
    console.log(chalk.gray(`  Exclude patterns: ${excludePatterns.join(', ')}`));
  }
  console.log();

  // Find all package.json files
  console.log(chalk.blue('🔎 Finding all package.json files...'));
  const packageJsons = await findAllPackageJsons(CONFIG.MONOREPO_ROOT, {
    includePatterns,
    excludePatterns,
  });
  console.log(chalk.gray(`  Found ${packageJsons.length} packages\n`));

  // Build package map
  console.log(chalk.blue('🔨 Building package map...'));
  const packageMap = await buildPackageMap(packageJsons, verbose);
  console.log(chalk.gray(`  Mapped ${packageMap.size} packages with tsconfig.json\n`));

  // Update all packages
  console.log(chalk.blue(`🔧 ${dryRun ? 'Analyzing' : 'Updating'} package references...\n`));

  let updatedCount = 0;
  let totalPackages = 0;
  let totalReferences = 0;

  for (const packageInfo of packageMap.values()) {
    totalPackages++;
    const changed = await updatePackageReferences(packageInfo, packageMap, CONFIG.MONOREPO_ROOT, dryRun, verbose);
    updatedCount += changed;

    // Count references that would be/were added
    if (packageInfo.workspaceDeps.length > 0) {
      // Only count dependencies that exist in our workspace
      const resolvedDeps = packageInfo.workspaceDeps.filter((dep) => packageMap.has(dep));
      totalReferences += resolvedDeps.length;
    }
  }

  // Update root tsconfig files
  console.log();
  console.log(chalk.blue('🔧 Updating root tsconfig files (solution-style)...\n'));

  const rootTsconfigPath = path.join(CONFIG.MONOREPO_ROOT, 'tsconfig.json');
  const rootTsconfigTsserverPath = path.join(CONFIG.MONOREPO_ROOT, 'tsconfig.tsserver.json');
  let rootUpdated = false;
  let rootTsconfigUpdated = false;

  try {
    // Check if root tsconfig.tsserver.json exists
    let hasRootTsserverConfig = false;
    try {
      await fs.access(rootTsconfigTsserverPath);
      hasRootTsserverConfig = true;
    } catch {
      // No root tsconfig.tsserver.json, will use tsconfig.json
    }

    if (hasRootTsserverConfig) {
      // Update root tsconfig.json to only reference tsconfig.tsserver.json
      const rootTsconfig = await readTsConfig(rootTsconfigPath);
      const rootTsconfigReferences: { path: string }[] = [{ path: './tsconfig.tsserver.json' }];

      const existingRootTsconfigRefs = rootTsconfig.references ?? [];
      const existingRootTsconfigPaths = new Set(existingRootTsconfigRefs.map((r) => r.path));
      const newRootTsconfigPaths = new Set(rootTsconfigReferences.map((r) => r.path));

      const rootTsconfigHasChanges =
        existingRootTsconfigRefs.length !== rootTsconfigReferences.length ||
        !Array.from(newRootTsconfigPaths).every((p) => existingRootTsconfigPaths.has(p));

      if (rootTsconfigHasChanges) {
        rootTsconfig.references = rootTsconfigReferences;
        if (!dryRun) {
          await writeTsConfig(rootTsconfigPath, rootTsconfig, true);
        }
        rootTsconfigUpdated = true;
        console.log(
          chalk.gray(`  ${dryRun ? '[DRY RUN] ' : ''}✓ Root tsconfig.json → only references tsconfig.tsserver.json`)
        );
      }

      // Update root tsconfig.tsserver.json with all packages
      const rootTsserverConfig = await readTsConfig(rootTsconfigTsserverPath);
      const rootReferences: { path: string }[] = [];

      // First, add sibling tsconfig.*.json files (exclude tsconfig.json and tsconfig.tsserver.json)
      const rootSiblingTsconfigs = await findSiblingTsconfigs(rootTsconfigTsserverPath, ['tsconfig.json']);
      for (const sibling of rootSiblingTsconfigs) {
        rootReferences.push({ path: sibling });
      }

      // Then, add all workspace packages
      const packagePaths = Array.from(packageMap.values())
        .filter((info) => !info.packageConfig.excludeThisPackage)
        .map((info) => {
          const targetPath = getStandardReferencePath(info);
          let pkgPath = path.relative(CONFIG.MONOREPO_ROOT, targetPath);
          if (!pkgPath.startsWith('./') && !pkgPath.startsWith('../')) {
            pkgPath = `./${pkgPath}`;
          }
          return pkgPath;
        })
        .sort();

      for (const pkgPath of packagePaths) {
        rootReferences.push({ path: pkgPath });
      }

      // Log excluded packages if verbose
      if (verbose) {
        const excludedPackages = Array.from(packageMap.values()).filter(
          (info) => info.packageConfig.excludeThisPackage
        );
        if (excludedPackages.length > 0) {
          console.log(chalk.gray(`  Skipping ${excludedPackages.length} package(s) excluded by config:`));
          for (const info of excludedPackages) {
            console.log(chalk.gray(`    - ${info.name}`));
          }
        }
      }

      // Check if root tsserver config needs update
      const existingRootRefs = rootTsserverConfig.references ?? [];
      const existingRootPaths = new Set(existingRootRefs.map((r) => r.path));
      const newRootPaths = new Set(rootReferences.map((r) => r.path));

      const rootHasChanges =
        existingRootRefs.length !== rootReferences.length ||
        !Array.from(newRootPaths).every((p) => existingRootPaths.has(p));

      if (rootHasChanges) {
        rootTsserverConfig.references = rootReferences;

        if (!dryRun) {
          await writeTsConfig(rootTsconfigTsserverPath, rootTsserverConfig, true);
        }

        console.log(
          chalk.cyan(
            `  ${dryRun ? '[DRY RUN] ' : ''}✓ Root tsconfig.tsserver.json updated (${rootReferences.length} references)`
          )
        );
        rootUpdated = true;
      } else {
        console.log(chalk.gray('  ✓ Root tsconfig.tsserver.json: no changes needed'));
      }
    } else {
      // Fall back to original behavior: update tsconfig.json directly
      console.log(chalk.gray('  No root tsconfig.tsserver.json found, updating tsconfig.json instead'));

      const rootTsconfig = await readTsConfig(rootTsconfigPath);
      const rootReferences: { path: string }[] = [];

      // First, add sibling tsconfig.*.json files (e.g., tsconfig.node.json)
      const rootSiblingTsconfigs = await findSiblingTsconfigs(rootTsconfigPath);
      for (const sibling of rootSiblingTsconfigs) {
        rootReferences.push({ path: sibling });
      }

      // Then, add all workspace packages
      const packagePaths = Array.from(packageMap.values())
        .filter((info) => !info.packageConfig.excludeThisPackage)
        .map((info) => {
          const targetPath = getStandardReferencePath(info);
          let pkgPath = path.relative(CONFIG.MONOREPO_ROOT, targetPath);
          if (!pkgPath.startsWith('./') && !pkgPath.startsWith('../')) {
            pkgPath = `./${pkgPath}`;
          }
          return pkgPath;
        })
        .sort();

      for (const pkgPath of packagePaths) {
        rootReferences.push({ path: pkgPath });
      }

      // Log excluded packages if verbose
      if (verbose) {
        const excludedPackages = Array.from(packageMap.values()).filter(
          (info) => info.packageConfig.excludeThisPackage
        );
        if (excludedPackages.length > 0) {
          console.log(chalk.gray(`  Skipping ${excludedPackages.length} package(s) excluded by config:`));
          for (const info of excludedPackages) {
            console.log(chalk.gray(`    - ${info.name}`));
          }
        }
      }

      // Check if root tsconfig needs update
      const existingRootRefs = rootTsconfig.references ?? [];
      const existingRootPaths = new Set(existingRootRefs.map((r) => r.path));
      const newRootPaths = new Set(rootReferences.map((r) => r.path));

      const rootHasChanges =
        existingRootRefs.length !== rootReferences.length ||
        !Array.from(newRootPaths).every((p) => existingRootPaths.has(p));

      if (rootHasChanges) {
        rootTsconfig.references = rootReferences;

        if (!dryRun) {
          await writeTsConfig(rootTsconfigPath, rootTsconfig, true);
        }

        console.log(
          chalk.cyan(
            `  ${dryRun ? '[DRY RUN] ' : ''}✓ Root tsconfig.json updated (${rootReferences.length} references)`
          )
        );
        rootUpdated = true;
      } else {
        console.log(chalk.gray('  ✓ Root tsconfig.json: no changes needed'));
      }
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠ Failed to update root solution-style tsconfig:'), error);
  }

  // Summary
  console.log();
  console.log(chalk.blue('📊 Summary:\n'));
  console.log(chalk.gray(`  Total packages processed: ${chalk.cyan(totalPackages)}`));
  console.log(chalk.gray(`  Packages ${dryRun ? 'that would be ' : ''}updated: ${chalk.cyan(updatedCount)}`));
  console.log(
    chalk.gray(
      `  Root solution-style tsconfig ${dryRun ? 'would be ' : ''}updated: ${chalk.cyan(rootUpdated || rootTsconfigUpdated ? 'Yes' : 'No')}`
    )
  );
  console.log(chalk.gray(`  Total references ${dryRun ? 'that would be ' : ''}added: ${chalk.cyan(totalReferences)}`));
  console.log();

  if (dryRun) {
    console.log(chalk.yellow('💡 Run without --dry-run to apply these changes\n'));
  } else if (updatedCount > 0 || rootUpdated || rootTsconfigUpdated) {
    console.log(
      chalk.green(
        `✅ Successfully updated ${updatedCount} package(s)${rootUpdated || rootTsconfigUpdated ? ' and root solution-style tsconfig' : ''}!\n`
      )
    );
  } else {
    console.log(chalk.green('✅ All packages already have correct references!\n'));
  }
}

main().catch((error: unknown) => {
  console.error(chalk.red('\n💥 Error:'), error);
  process.exit(1);
});
