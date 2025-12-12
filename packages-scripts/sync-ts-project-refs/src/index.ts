#!/usr/bin/env tsx

/**
 * Sync TypeScript Project References
 *
 * Automatically add TypeScript project references to all packages based on their workspace dependencies.
 * Reads package.json dependencies and generates corresponding references in tsconfig.json.
 *
 * Supports advanced configuration via YAML files:
 * - stspr.package.yaml: Package-level configuration
 * - tsconfig.stspr.yaml: TypeScript config-level configuration
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import chalk from 'chalk';
import { $ } from 'zx';

import { parseWorkspace } from './config-reader.js';
import { resolveExcludedDirs, resolveExcludedFiles } from './filters.js';
import { findAllPackageJsons } from './fs-utils.js';
import { buildPackageMap } from './package-parser.js';
import { updatePackageReferences } from './package-updater.js';
import { updateRootTsconfig } from './root-updater.js';

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

  ${chalk.bold('stspr.package.yaml')} (Package-level configuration):
  - exclude: Exclude this package from processing
  - canonicalTsconfig.path: Canonical tsconfig for this package (what other packages should reference)
  - canonicalTsconfig.includeSiblings: Whether canonical should reference sibling tsconfig.*.json files (discovery)
  - canonicalTsconfig.standardReferencesCanonical: Whether tsconfig.json should reference canonical (derived by default)
  - canonicalTsconfig.includeWorkspaceDeps: Whether canonical should include workspace dependency references
  - dependencies.include.*: Control dependency scanning (dependencies/devDependencies/optionalDependencies)
  - references.add/skip: Add/skip references for the canonical tsconfig only

  ${chalk.bold('tsconfig.stspr.yaml')} (TypeScript config-level configuration):
  - exclude: Exclude this specific tsconfig
  - includeWorkspaceDeps: Whether this tsconfig should include workspace dependency references
  - references.add/skip: Add/skip references for this specific tsconfig

  Notes:
  - For tsconfig.{name}.json you can use tsconfig.{name}.stspr.yaml (e.g. tsconfig.custom.stspr.yaml)

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
  const { includePatterns, excludePatterns, rootConfig } = await parseWorkspace(workspaceRoot);
  const includeIndirectDeps = rootConfig.graph.includeIndirectDeps;
  const solutionTsconfigPathConfig = rootConfig.rootSolution.tsconfigPath;
  const rootSolutionTsconfigPath = path.isAbsolute(solutionTsconfigPathConfig)
    ? solutionTsconfigPathConfig
    : path.resolve(workspaceRoot, solutionTsconfigPathConfig);
  const rootSolutionDisplayPath =
    path.relative(workspaceRoot, rootSolutionTsconfigPath) || path.basename(rootSolutionTsconfigPath);
  if (verbose) {
    console.log(chalk.gray(`  Include patterns: ${includePatterns.join(', ')}`));
    console.log(chalk.gray(`  Exclude patterns: ${excludePatterns.join(', ')}`));
    console.log(chalk.gray(`  Include indirect dependencies: ${includeIndirectDeps ? 'yes' : 'no'}`));
    console.log(chalk.gray(`  Root solution tsconfig: ${rootSolutionDisplayPath}`));
  }
  console.log();

  // Find all package.json files
  console.log(chalk.blue('🔎 Finding all package.json files...'));
  const allPackageJsons = await findAllPackageJsons(workspaceRoot, {
    includePatterns,
    excludePatterns,
  });
  const excludedPackageDirs = await resolveExcludedDirs(workspaceRoot, rootConfig.filters.excludePackages);
  const excludedTsconfigs = await resolveExcludedFiles(workspaceRoot, rootConfig.filters.excludeTsconfigs);

  const packageJsons = allPackageJsons.filter((p) => !excludedPackageDirs.has(path.dirname(p)));
  console.log(chalk.gray(`  Found ${packageJsons.length} packages\n`));

  // Build package map
  console.log(chalk.blue('🔨 Building package map...'));
  const packageMap = await buildPackageMap(packageJsons, { verbose, excludedTsconfigs });
  console.log(chalk.gray(`  Mapped ${packageMap.size} packages with tsconfig.json\n`));

  // Update all packages
  console.log(chalk.blue(`🔧 ${dryRun ? 'Analyzing' : 'Updating'} package references...\n`));

  let packagesUpdated = 0;
  let tsconfigsUpdated = 0;
  let totalPackages = 0;

  for (const packageInfo of packageMap.values()) {
    totalPackages++;
    const result = await updatePackageReferences(
      packageInfo,
      packageMap,
      workspaceRoot,
      dryRun || check,
      verbose,
      includeIndirectDeps,
      excludedTsconfigs
    );
    packagesUpdated += result.packagesUpdated;
    tsconfigsUpdated += result.tsconfigsUpdated;
  }

  // Update root tsconfig files
  console.log();
  console.log(chalk.blue('🔧 Updating root solution tsconfig...\n'));
  let rootUpdated = false;
  try {
    rootUpdated = await updateRootTsconfig(workspaceRoot, packageMap, rootConfig, dryRun || check, excludedTsconfigs);
    if (verbose) {
      console.log(chalk.gray(`  Root solution updated: ${rootUpdated ? 'yes' : 'no'}`));
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠ Failed to update root solution tsconfig:'), error);
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
      `  Root solution-style tsconfig ${dryRun || check ? 'would be ' : ''}updated: ${chalk.cyan(rootUpdated ? 'Yes' : 'No')}`
    )
  );
  console.log();

  if (check) {
    if (packagesUpdated > 0 || rootUpdated) {
      console.log(
        chalk.red(
          `❌ Check failed: ${packagesUpdated} package(s)${rootUpdated ? ' and root solution-style tsconfig' : ''} need(s) to be updated!\n`
        )
      );
      console.log(chalk.yellow('💡 Run without --check to apply these changes\n'));
      process.exit(1);
    } else {
      console.log(chalk.green('✅ All packages have correct references!\n'));
    }
  } else if (dryRun) {
    console.log(chalk.yellow('💡 Run without --dry-run to apply these changes\n'));
  } else if (packagesUpdated > 0 || rootUpdated) {
    console.log(
      chalk.green(
        `✅ Successfully updated ${packagesUpdated} package(s)${rootUpdated ? ' and root solution-style tsconfig' : ''}!\n`
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
