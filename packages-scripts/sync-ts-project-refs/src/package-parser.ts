/**
 * Package information parsing and workspace dependency resolution
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import chalk from 'chalk';

import { readPackageConfig, readTsconfigConfig } from './config-reader.js';
import type { PackageInfo, PackageJson, TsconfigConfig } from './types.js';

/**
 * Get package information including workspace dependencies
 */
export async function getPackageInfo(packageJsonPath: string, verbose = false): Promise<PackageInfo | null> {
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
    if (packageConfig.excludeThisPackage) {
      if (verbose) {
        console.log(chalk.gray(`  ${pkg.name}: excluded by package config (will be skipped by dependents)`));
      }
      return null;
    }

    // Check if tsconfig.json exists
    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    try {
      await fs.access(tsconfigPath);
    } catch {
      if (verbose) {
        console.log(chalk.gray(`  Skipping ${pkg.name}: no tsconfig.json`));
      }
      return null;
    }

    // Determine main tsconfig path based on configuration
    let alterTsconfigPath: string | null = null;

    if (packageConfig.useAlterTsconfig && packageConfig.alterTsconfigPath) {
      const altPath = path.resolve(packageDir, packageConfig.alterTsconfigPath);
      try {
        await fs.access(altPath);
        alterTsconfigPath = altPath;
        if (verbose) {
          console.log(
            chalk.gray(
              `  ${pkg.name}: using ${packageConfig.alterTsconfigPath} as alter tsconfig (will be used as canonical reference)`
            )
          );
        }
      } catch {
        if (verbose) {
          console.log(
            chalk.yellow(
              `  ${pkg.name}: configured alter tsconfig ${packageConfig.alterTsconfigPath} not found, using tsconfig.json`
            )
          );
        }
      }
    } else {
      // Check if tsconfig.tsserver.json exists (legacy behavior)
      const legacyTsserverPath = path.join(packageDir, 'tsconfig.tsserver.json');
      try {
        await fs.access(legacyTsserverPath);
        alterTsconfigPath = legacyTsserverPath;
        if (verbose) {
          console.log(chalk.gray(`  ${pkg.name}: has tsconfig.tsserver.json (will be used as canonical reference)`));
        }
      } catch {
        // No alter tsconfig, continue normally
      }
    }

    // Find all tsconfig.*.json files
    const tsconfigPaths: string[] = [];
    const tsconfigConfigs = new Map<string, TsconfigConfig>();

    try {
      const files = await fs.readdir(packageDir);
      const allTsconfigs = files
        .filter(
          (f) => f.startsWith('tsconfig.') && f.endsWith('.json') && f !== 'tsconfig.json' // Exclude the main tsconfig.json
        )
        .map((f) => path.join(packageDir, f));

      // Read config for each tsconfig and filter based on exclude settings
      for (const tsconfigPath of allTsconfigs) {
        const config = await readTsconfigConfig(tsconfigPath);
        tsconfigConfigs.set(tsconfigPath, config);

        if (!config.excludeThisTsconfig) {
          tsconfigPaths.push(tsconfigPath);
        } else if (verbose) {
          console.log(chalk.gray(`  ${pkg.name}: excluding ${path.basename(tsconfigPath)} by tsconfig config`));
        }
      }

      // Also read config for main tsconfig files
      tsconfigConfigs.set(tsconfigPath, await readTsconfigConfig(tsconfigPath));
      if (alterTsconfigPath) {
        tsconfigConfigs.set(alterTsconfigPath, await readTsconfigConfig(alterTsconfigPath));
      }

      tsconfigPaths.sort();
    } catch {
      // No sibling tsconfigs found
    }

    const workspaceDeps = new Set<string>();

    // Check dependency types based on configuration
    const depTypes: (keyof PackageJson)[] = [];
    if (!packageConfig.skipDeps) depTypes.push('dependencies');
    if (!packageConfig.skipDevDeps) depTypes.push('devDependencies');
    if (!packageConfig.skipOptionalDeps) depTypes.push('optionalDependencies');
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
      tsconfigPath,
      alterTsconfigPath,
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
export async function buildPackageMap(packageJsons: string[], verbose = false): Promise<Map<string, PackageInfo>> {
  const packageMap = new Map<string, PackageInfo>();

  for (const packageJsonPath of packageJsons) {
    const info = await getPackageInfo(packageJsonPath, verbose);
    if (info) {
      packageMap.set(info.name, info);
    }
  }

  return packageMap;
}

/**
 * Get the canonical reference path for a package (alter tsconfig if configured, otherwise tsconfig.json)
 */
export function getCanonicalReferencePath(packageInfo: PackageInfo): string {
  return packageInfo.alterTsconfigPath ?? packageInfo.tsconfigPath;
}
