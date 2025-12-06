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
import { findAllPackageJsons, findSiblingTsconfigs, readTsConfig, writeTsConfig } from './fs-utils.js';
import { buildPackageMap, getCanonicalReferencePath } from './package-parser.js';
import { updatePackageReferences } from './package-updater.js';

$.verbose = false;

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run') || args.includes('-d');
const verbose = args.includes('--verbose') || args.includes('-v');
const check = args.includes('--check');

// Parse workspace root argument
const workspaceRootIndex = args.findIndex((arg) => arg === '--workspace-root' || arg === '-r');
const customWorkspaceRoot = workspaceRootIndex !== -1 ? args[workspaceRootIndex + 1] : undefined;

// Validate arguments - check for unknown flags
const knownFlags = new Set(['--help', '-h', '--dry-run', '-d', '--verbose', '-v', '--check', '--workspace-root', '-r']);

const unknownArgs: string[] = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg?.startsWith('-')) {
    if (!knownFlags.has(arg)) {
      unknownArgs.push(arg);
    }
    // Skip the next argument if this is --workspace-root or -r
    if ((arg === '--workspace-root' || arg === '-r') && i + 1 < args.length) {
      i++;
    }
  }
}

if (unknownArgs.length > 0) {
  console.error(chalk.red(`\n❌ Error: Unknown argument(s): ${unknownArgs.join(', ')}\n`));
  console.log(chalk.gray('Run with --help to see available options.\n'));
  process.exit(1);
}

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
  --workspace-root, -r <path>  Specify workspace root directory (default: auto-detect using pnpm)
  --check                      Check if references are up-to-date (exit with error if not)
  --dry-run, -d                Preview changes without modifying files
  --verbose, -v                Show detailed information
  --help, -h                   Show this help message

${chalk.bold('Examples:')}
  # Check if references are up-to-date (useful in CI)
  tsx scripts/monorepo/sync-ts-project-refs --check

  # Preview what would be changed (auto-detects workspace root)
  tsx scripts/monorepo/sync-ts-project-refs --dry-run

  # Apply changes to all packages
  tsx scripts/monorepo/sync-ts-project-refs

  # Apply changes with verbose output
  tsx scripts/monorepo/sync-ts-project-refs --verbose

  # Specify a custom workspace root (skips auto-detection)
  tsx scripts/monorepo/sync-ts-project-refs --workspace-root /path/to/workspace

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

if (check) {
  console.log(chalk.blue('🔍 CHECK MODE - Verifying references are up-to-date\n'));
} else if (dryRun) {
  console.log(chalk.yellow('🔍 DRY RUN MODE - No files will be modified\n'));
}

/**
 * Find workspace root by searching for pnpm-workspace.yaml
 */
async function findWorkspaceRoot(): Promise<string> {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const workspaceFile = path.join(currentDir, 'pnpm-workspace.yaml');
    try {
      await fs.access(workspaceFile);
      return currentDir;
    } catch {
      // File doesn't exist, go up one directory
      currentDir = path.dirname(currentDir);
    }
  }

  throw new Error(
    'Failed to find workspace root. Make sure you are in a pnpm workspace (no pnpm-workspace.yaml found).'
  );
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Determine workspace root
  let workspaceRoot: string;
  if (customWorkspaceRoot) {
    workspaceRoot = path.resolve(customWorkspaceRoot);
    console.log(chalk.blue('🔧 Adding TypeScript project references...\n'));
    console.log(chalk.gray(`Using specified workspace root: ${workspaceRoot}\n`));
  } else {
    console.log(chalk.blue('🔧 Adding TypeScript project references...\n'));
    console.log(chalk.gray('Finding workspace root using pnpm...'));
    workspaceRoot = await findWorkspaceRoot();
    console.log(chalk.gray(`Found workspace root: ${workspaceRoot}\n`));
  }

  // Parse workspace configuration
  console.log(chalk.blue('📦 Parsing workspace configuration...'));
  const { includePatterns, excludePatterns } = await parseWorkspace(workspaceRoot);
  if (verbose) {
    console.log(chalk.gray(`  Include patterns: ${includePatterns.join(', ')}`));
    console.log(chalk.gray(`  Exclude patterns: ${excludePatterns.join(', ')}`));
  }
  console.log();

  // Find all package.json files
  console.log(chalk.blue('🔎 Finding all package.json files...'));
  const packageJsons = await findAllPackageJsons(workspaceRoot, {
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

  let packagesUpdated = 0;
  let tsconfigsUpdated = 0;
  let totalPackages = 0;

  for (const packageInfo of packageMap.values()) {
    totalPackages++;
    const result = await updatePackageReferences(packageInfo, packageMap, workspaceRoot, dryRun || check, verbose);
    packagesUpdated += result.packagesUpdated;
    tsconfigsUpdated += result.tsconfigsUpdated;
  }

  // Update root tsconfig files
  console.log();
  console.log(chalk.blue('🔧 Updating root tsconfig files (solution-style)...\n'));

  const rootTsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
  const rootTsconfigTsserverPath = path.join(workspaceRoot, 'tsconfig.tsserver.json');
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
        if (!dryRun && !check) {
          rootTsconfigUpdated = await writeTsConfig(rootTsconfigPath, rootTsconfig, true);
        } else {
          rootTsconfigUpdated = true;
        }
        if (rootTsconfigUpdated) {
          console.log(
            chalk.gray(
              `  ${dryRun || check ? '[DRY RUN] ' : ''}✓ Root tsconfig.json → only references tsconfig.tsserver.json`
            )
          );
        }
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

        if (!dryRun && !check) {
          rootUpdated = await writeTsConfig(rootTsconfigTsserverPath, rootTsserverConfig, true);
        } else {
          rootUpdated = true;
        }

        if (rootUpdated) {
          console.log(
            chalk.cyan(
              `  ${dryRun || check ? '[DRY RUN] ' : ''}✓ Root tsconfig.tsserver.json updated (${rootReferences.length} references)`
            )
          );
        } else {
          console.log(chalk.gray('  ✓ Root tsconfig.tsserver.json: no changes needed'));
        }
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

        if (!dryRun && !check) {
          rootUpdated = await writeTsConfig(rootTsconfigPath, rootTsconfig, true);
        } else {
          rootUpdated = true;
        }

        if (rootUpdated) {
          console.log(
            chalk.cyan(
              `  ${dryRun || check ? '[DRY RUN] ' : ''}✓ Root tsconfig.json updated (${rootReferences.length} references)`
            )
          );
        } else {
          console.log(chalk.gray('  ✓ Root tsconfig.json: no changes needed'));
        }
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
  console.log(
    chalk.gray(`  Packages ${dryRun || check ? 'that would be ' : ''}updated: ${chalk.cyan(packagesUpdated)}`)
  );
  console.log(
    chalk.gray(`  Tsconfig files ${dryRun || check ? 'that would be ' : ''}updated: ${chalk.cyan(tsconfigsUpdated)}`)
  );
  console.log(
    chalk.gray(
      `  Root solution-style tsconfig ${dryRun || check ? 'would be ' : ''}updated: ${chalk.cyan(rootUpdated || rootTsconfigUpdated ? 'Yes' : 'No')}`
    )
  );
  console.log();

  if (check) {
    if (packagesUpdated > 0 || rootUpdated || rootTsconfigUpdated) {
      console.log(
        chalk.red(
          `❌ Check failed: ${packagesUpdated} package(s)${rootUpdated || rootTsconfigUpdated ? ' and root solution-style tsconfig' : ''} need(s) to be updated!\n`
        )
      );
      console.log(chalk.yellow('💡 Run without --check to apply these changes\n'));
      process.exit(1);
    } else {
      console.log(chalk.green('✅ All packages have correct references!\n'));
    }
  } else if (dryRun) {
    console.log(chalk.yellow('💡 Run without --dry-run to apply these changes\n'));
  } else if (packagesUpdated > 0 || rootUpdated || rootTsconfigUpdated) {
    console.log(
      chalk.green(
        `✅ Successfully updated ${packagesUpdated} package(s)${rootUpdated || rootTsconfigUpdated ? ' and root solution-style tsconfig' : ''}!\n`
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
