/**
 * Package information parsing and workspace dependency resolution
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import chalk from 'chalk';

import { readPackageConfig, readTsconfigConfig } from './config-reader.js';
import { isExcludedByFileSet } from './filters.js';
import type { PackageInfo, PackageJson, TsconfigConfig } from './types.js';

/**
 * Get package information including workspace dependencies
 */
export async function getPackageInfo(
  packageJsonPath: string,
  opts: { verbose?: boolean; excludedTsconfigs?: Set<string> } = {}
): Promise<PackageInfo | null> {
  const verbose = opts.verbose ?? false;
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content) as PackageJson;

    if (!pkg.name) {
      return null;
    }

    const packageDir = path.dirname(packageJsonPath);

    // Read package-level configuration
    const packageConfig = await readPackageConfig(packageDir);

    // Skip if package is excluded
    if (packageConfig.exclude) {
      if (verbose) {
        console.log(chalk.gray(`  ${pkg.name}: excluded by package config (will be skipped by dependents)`));
      }
      return null;
    }

    // Check if tsconfig.json exists
    const standardTsconfigPath = path.join(packageDir, 'tsconfig.json');
    try {
      await fs.access(standardTsconfigPath);
    } catch {
      if (verbose) {
        console.log(chalk.gray(`  Skipping ${pkg.name}: no tsconfig.json`));
      }
      return null;
    }

    // Resolve canonical tsconfig path
    const canonicalCandidatePath = path.resolve(packageDir, packageConfig.canonicalTsconfig.path);
    let canonicalResolved = standardTsconfigPath;
    try {
      await fs.access(canonicalCandidatePath);
      canonicalResolved = canonicalCandidatePath;
    } catch {
      if (verbose && packageConfig.canonicalTsconfig.path !== './tsconfig.json') {
        console.log(
          chalk.yellow(
            `  ${pkg.name}: configured canonical tsconfig ${packageConfig.canonicalTsconfig.path} not found, falling back to tsconfig.json`
          )
        );
      }
    }

    // Find all tsconfig.*.json files
    const tsconfigPaths: string[] = [];
    const tsconfigConfigs = new Map<string, TsconfigConfig>(); // tsconfig path -> config

    try {
      const files = await fs.readdir(packageDir);
      const allTsconfigs = files
        .filter(
          (f) => f.startsWith('tsconfig.') && f.endsWith('.json') && f !== 'tsconfig.json' // Exclude the main tsconfig.json
        )
        .map((f) => path.join(packageDir, f));

      // Read config for each tsconfig and filter based on exclude settings
      for (const tsconfigPath of allTsconfigs) {
        if (opts.excludedTsconfigs && isExcludedByFileSet(tsconfigPath, opts.excludedTsconfigs)) {
          if (verbose) {
            console.log(chalk.gray(`  ${pkg.name}: excluding ${path.basename(tsconfigPath)} by root filters`));
          }
          continue;
        }
        const config = await readTsconfigConfig(tsconfigPath);
        tsconfigConfigs.set(tsconfigPath, config);

        if (!config.exclude) {
          tsconfigPaths.push(tsconfigPath);
        } else if (verbose) {
          console.log(chalk.gray(`  ${pkg.name}: excluding ${path.basename(tsconfigPath)} by tsconfig config`));
        }
      }

      // Also read config for main tsconfig files
      if (!opts.excludedTsconfigs || !isExcludedByFileSet(standardTsconfigPath, opts.excludedTsconfigs)) {
        tsconfigConfigs.set(standardTsconfigPath, await readTsconfigConfig(standardTsconfigPath));
      }
      if (!opts.excludedTsconfigs || !isExcludedByFileSet(canonicalResolved, opts.excludedTsconfigs)) {
        tsconfigConfigs.set(canonicalResolved, await readTsconfigConfig(canonicalResolved));
      }

      tsconfigPaths.sort();
    } catch {
      // No sibling tsconfigs found
    }

    const workspaceDeps = new Set<string>();

    // Check dependency types based on configuration
    const depTypes: (keyof PackageJson)[] = [];
    if (packageConfig.dependencies.include.dependencies) depTypes.push('dependencies');
    if (packageConfig.dependencies.include.devDependencies) depTypes.push('devDependencies');
    if (packageConfig.dependencies.include.optionalDependencies) depTypes.push('optionalDependencies');
    depTypes.push('peerDependencies'); // Always include peer deps

    for (const depType of depTypes) {
      const deps = pkg[depType] ?? {};
      for (const [name, version] of Object.entries(deps)) {
        // Only include workspace dependencies
        if (version.startsWith('workspace:')) {
          // Exclude self-references
          if (name !== pkg.name) {
            workspaceDeps.add(name);
          }
        }
      }
    }

    return {
      name: pkg.name,
      packageJsonPath,
      packageDir,
      standardTsconfigPath,
      canonicalTsconfigPath: canonicalResolved,
      tsconfigPaths,
      workspaceDeps: Array.from(workspaceDeps),
      packageConfig,
      tsconfigConfigs,
    };
  } catch (error) {
    console.warn(chalk.yellow(`⚠ Failed to read ${packageJsonPath}:`), error);
    return null;
  }
}

/**
 * Build package map: package name -> package info
 */
export async function buildPackageMap(
  packageJsons: string[],
  opts: { verbose?: boolean; excludedTsconfigs?: Set<string> } = {}
): Promise<Map<string, PackageInfo>> {
  const verbose = opts.verbose ?? false;
  const packageMap = new Map<string, PackageInfo>();

  for (const packageJsonPath of packageJsons) {
    const info = await getPackageInfo(packageJsonPath, { verbose, excludedTsconfigs: opts.excludedTsconfigs });
    if (info) {
      packageMap.set(info.name, info);
    }
  }

  return packageMap;
}

/**
 * Get the canonical reference path for a package (v2: canonicalTsconfigPath)
 */
export function getCanonicalReferencePath(packageInfo: PackageInfo): string {
  return packageInfo.canonicalTsconfigPath;
}
