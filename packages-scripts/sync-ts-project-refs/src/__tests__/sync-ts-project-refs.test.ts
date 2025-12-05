/**
 * Integration tests for sync-ts-project-refs
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseWorkspace } from '../config-reader.js';
import { findAllPackageJsons, readTsConfig, writeTsConfig } from '../fs-utils.js';
import { buildPackageMap, getStandardReferencePath } from '../package-parser.js';
import { updatePackageReferences } from '../package-updater.js';
import type { PackageInfo } from '../types.js';

interface TestCase {
  name: string;
  dir: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'basic workspace dependencies',
    dir: 'case-01-basic',
  },
  {
    name: 'use-alter-tsconfig mode',
    dir: 'case-02-alter-tsconfig',
  },
  {
    name: 'extra-refs from tsconfig.stspr.yaml',
    dir: 'case-04-extra-refs',
  },
  {
    name: 'alter-tsconfig with extra-refs',
    dir: 'case-05-alter-tsconfig-with-extra-refs',
  },
];

describe('sync-ts-project-refs', () => {
  const testDir: string = path.dirname(new URL(import.meta.url).pathname);
  const fixturesDir: string = path.join(testDir, '__fixtures__');
  let tempDir = '';

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = path.join(testDir, `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  for (const testCase of TEST_CASES) {
    it(testCase.name, async () => {
      const inputDir = path.join(fixturesDir, testCase.dir, 'input');
      const expectedDir = path.join(fixturesDir, testCase.dir, 'expected');
      const workDir = path.join(tempDir, testCase.dir);

      // Copy input to work directory
      await copyDir(inputDir, workDir);

      // Run the sync tool
      const { includePatterns, excludePatterns } = await parseWorkspace(workDir);
      const packageJsons = await findAllPackageJsons(workDir, { includePatterns, excludePatterns });
      const packageMap = await buildPackageMap(packageJsons, false);

      // Update all packages
      for (const packageInfo of packageMap.values()) {
        await updatePackageReferences(packageInfo, packageMap, workDir, false, false);
      }

      // Update root tsconfig.json
      await updateRootTsconfig(workDir, packageMap);

      // Compare with expected output
      await compareDirectories(workDir, expectedDir);
    });

    it(`${testCase.name} - idempotent (no changes on second run)`, async () => {
      const inputDir = path.join(fixturesDir, testCase.dir, 'input');
      const workDir = path.join(tempDir, `${testCase.dir}-idempotent`);

      // Copy input to work directory
      await copyDir(inputDir, workDir);

      // Run the sync tool twice
      for (let i = 0; i < 2; i++) {
        const { includePatterns, excludePatterns } = await parseWorkspace(workDir);
        const packageJsons = await findAllPackageJsons(workDir, { includePatterns, excludePatterns });
        const packageMap = await buildPackageMap(packageJsons, false);

        let changesCount = 0;
        for (const packageInfo of packageMap.values()) {
          const result = await updatePackageReferences(packageInfo, packageMap, workDir, false, false);
          changesCount += result.packagesUpdated;
        }

        if (i === 0) {
          // First run should make changes
          expect(changesCount).toBeGreaterThan(0);
        } else {
          // Second run should make no changes
          expect(changesCount).toBe(0);
        }
      }
    });
  }
});

/**
 * Copy directory recursively
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Compare two directories recursively
 */
async function compareDirectories(actualDir: string, expectedDir: string): Promise<void> {
  const expectedFiles = await getAllFiles(expectedDir);

  for (const relPath of expectedFiles) {
    const actualPath = path.join(actualDir, relPath);
    const expectedPath = path.join(expectedDir, relPath);

    // Check if file exists
    try {
      await fs.access(actualPath);
    } catch {
      throw new Error(`Expected file not found: ${relPath}`);
    }

    // Compare file contents
    const actualContent = await fs.readFile(actualPath, 'utf-8');
    const expectedContent = await fs.readFile(expectedPath, 'utf-8');

    // For JSON files, parse and compare to ignore formatting differences
    if (relPath.endsWith('.json')) {
      const actualJson = JSON.parse(actualContent) as unknown;
      const expectedJson = JSON.parse(expectedContent) as unknown;
      expect(actualJson).toEqual(expectedJson);
    } else {
      expect(actualContent).toBe(expectedContent);
    }
  }
}

/**
 * Get all files in a directory recursively
 */
async function getAllFiles(dir: string, baseDir = dir): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath, baseDir)));
    } else {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Update root tsconfig.json with all package references
 */
async function updateRootTsconfig(workDir: string, packageMap: Map<string, PackageInfo>): Promise<void> {
  const rootTsconfigPath = path.join(workDir, 'tsconfig.json');
  const rootTsconfig = await readTsConfig(rootTsconfigPath);
  const rootReferences: { path: string }[] = [];

  // Add all workspace packages
  const packagePaths = Array.from(packageMap.values())
    .filter((info) => !info.packageConfig.excludeThisPackage)
    .map((info) => {
      const targetPath = getStandardReferencePath(info);
      let pkgPath = path.relative(workDir, targetPath);
      if (!pkgPath.startsWith('./') && !pkgPath.startsWith('../')) {
        pkgPath = `./${pkgPath}`;
      }
      return pkgPath;
    })
    .sort();

  for (const pkgPath of packagePaths) {
    rootReferences.push({ path: pkgPath });
  }

  rootTsconfig.references = rootReferences;
  await writeTsConfig(rootTsconfigPath, rootTsconfig, false);
}
