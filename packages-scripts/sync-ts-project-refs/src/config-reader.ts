/**
 * Configuration file readers for STSPR (Sync TypeScript Project References)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import yaml from 'yaml';
import { z } from 'zod';

import type { PackageConfig, RootConfig, TsconfigConfig, WorkspaceConfig } from './types.js';

// Zod schemas for configuration validation
const WorkspaceConfigSchema = z.object({
  packages: z.array(z.string()).optional().default([]),
});

const RefSchema = z.object({
  path: z.string(),
});

const RootConfigSchema = z.object({
  'include-indirect-deps': z.boolean().optional().default(false),
});

const PackageConfigSchema = z.object({
  'use-alter-tsconfig': z.boolean().optional().default(false),
  'alter-tsconfig-path': z.string().optional().default('./tsconfig.tsserver.json'),
  'skip-add-alter-tsconfig-to-main-tsconfig': z.boolean().optional().default(false),
  'include-deps-in-main-tsconfig-if-using-alter-tsconfig': z.boolean().optional().default(false),
  'exclude-this-package': z.boolean().optional().default(false),
  'skip-deps': z.boolean().optional().default(false),
  'skip-dev-deps': z.boolean().optional().default(false),
  'skip-optional-deps': z.boolean().optional().default(false),
  'extra-refs': z.array(RefSchema).optional().default([]),
  'skip-refs': z.array(RefSchema).optional().default([]),
});

const TsconfigConfigSchema = z.object({
  'exclude-this-tsconfig': z.boolean().optional().default(false),
  'extra-refs': z.array(RefSchema).optional().default([]),
  'skip-refs': z.array(RefSchema).optional().default([]),
});

/**
 * Parse pnpm-workspace.yaml to get package patterns
 */
export async function parseWorkspace(monorepoRoot: string): Promise<WorkspaceConfig> {
  const workspaceFile = path.join(monorepoRoot, 'pnpm-workspace.yaml');
  const content = await fs.readFile(workspaceFile, 'utf-8');
  const rawConfig: unknown = yaml.parse(content);
  const config = WorkspaceConfigSchema.parse(rawConfig);
  const rootConfig = await readRootConfig(monorepoRoot);

  const { packages } = config;
  const includePatterns: string[] = [];
  const excludePatterns: string[] = [];

  for (const pattern of packages) {
    if (pattern.startsWith('!')) {
      excludePatterns.push(pattern.slice(1));
    } else {
      includePatterns.push(pattern);
    }
  }

  return { includePatterns, excludePatterns, rootConfig };
}

/**
 * Read package-level STSPR configuration
 */
export async function readPackageConfig(packageDir: string): Promise<PackageConfig> {
  const configPath = path.join(packageDir, 'tsconfig.stspr-package.yaml');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const rawConfig: unknown = yaml.parse(content);
    const config = PackageConfigSchema.parse(rawConfig);

    return {
      useAlterTsconfig: config['use-alter-tsconfig'],
      alterTsconfigPath: config['alter-tsconfig-path'],
      skipAddAlterTsconfigToMainTsconfig: config['skip-add-alter-tsconfig-to-main-tsconfig'],
      includeDepsInMainTsconfigIfAlterTsconfigExists: config['include-deps-in-main-tsconfig-if-using-alter-tsconfig'],
      excludeThisPackage: config['exclude-this-package'],
      skipDeps: config['skip-deps'],
      skipDevDeps: config['skip-dev-deps'],
      skipOptionalDeps: config['skip-optional-deps'],
      extraRefs: config['extra-refs'],
      skipRefs: config['skip-refs'],
    };
  } catch {
    // No config file or parsing error, return defaults
    const defaultConfig = PackageConfigSchema.parse({});
    return {
      useAlterTsconfig: defaultConfig['use-alter-tsconfig'],
      alterTsconfigPath: defaultConfig['alter-tsconfig-path'],
      skipAddAlterTsconfigToMainTsconfig: defaultConfig['skip-add-alter-tsconfig-to-main-tsconfig'],
      includeDepsInMainTsconfigIfAlterTsconfigExists:
        defaultConfig['include-deps-in-main-tsconfig-if-using-alter-tsconfig'],
      excludeThisPackage: defaultConfig['exclude-this-package'],
      skipDeps: defaultConfig['skip-deps'],
      skipDevDeps: defaultConfig['skip-dev-deps'],
      skipOptionalDeps: defaultConfig['skip-optional-deps'],
      extraRefs: defaultConfig['extra-refs'],
      skipRefs: defaultConfig['skip-refs'],
    };
  }
}

/**
 * Read root-level STSPR configuration
 */
export async function readRootConfig(monorepoRoot: string): Promise<RootConfig> {
  const configPath = path.join(monorepoRoot, 'tsconfig.stspr-root.yaml');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const rawConfig: unknown = yaml.parse(content);
    const config = RootConfigSchema.parse(rawConfig);

    return {
      includeIndirectDeps: config['include-indirect-deps'],
    };
  } catch {
    const defaultConfig = RootConfigSchema.parse({});
    return {
      includeIndirectDeps: defaultConfig['include-indirect-deps'],
    };
  }
}

/**
 * Read tsconfig-level STSPR configuration
 */
export async function readTsconfigConfig(tsconfigPath: string): Promise<TsconfigConfig> {
  const dir = path.dirname(tsconfigPath);
  const basename = path.basename(tsconfigPath, '.json');
  const configPath = path.join(dir, `${basename}.stspr.yaml`);

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const rawConfig: unknown = yaml.parse(content);
    const config = TsconfigConfigSchema.parse(rawConfig);

    return {
      excludeThisTsconfig: config['exclude-this-tsconfig'],
      extraRefs: config['extra-refs'],
      skipRefs: config['skip-refs'],
    };
  } catch {
    // No config file or parsing error, return defaults
    const defaultConfig = TsconfigConfigSchema.parse({});
    return {
      excludeThisTsconfig: defaultConfig['exclude-this-tsconfig'],
      extraRefs: defaultConfig['extra-refs'],
      skipRefs: defaultConfig['skip-refs'],
    };
  }
}
