/**
 * Integration tests for sync-ts-project-refs
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseWorkspace } from '../config-reader.js';
import { findAllPackageJsons } from '../fs-utils.js';
import { buildPackageMap } from '../package-parser.js';
import { updatePackageReferences } from '../package-updater.js';
import { updateRootTsconfig } from '../root-updater.js';

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
  {
    name: 'preserve comments in tsconfig.json',
    dir: 'case-06-preserve-comments',
  },
  {
    name: 'alter-tsconfig with sibling tsconfig files',
    dir: 'case-07-alter-tsconfig-with-sibling',
  },
  {
    name: 'include indirect dependencies from root config',
    dir: 'case-08-indirect-deps',
  },
  {
    name: 'custom root solution tsconfig path',
    dir: 'case-09-root-solution-path',
  },
  {
    name: 'remove stale references',
    dir: 'case-10-remove-reference',
  },
  {
    name: 'tsconfig.tsserver.json treated as sibling when use-alter-tsconfig is false',
    dir: 'case-11-tsserver-as-sibling',
  },
];

describe('sync-ts-project-refs', () => {
  const testDir: string = path.dirname(new URL(import.meta.url).pathname);
  const fixturesDir: string = path.join(testDir, '__fixtures__');
  let tempDir = '';

  beforeEach(async () => {
    // Create a temporary directory for each test in the OS temp directory
    const envTmp = process.env.STSPR_TMPDIR;
    const tempBase = envTmp ? path.resolve(envTmp) : os.tmpdir();
    await fs.mkdir(tempBase, { recursive: true });
    tempDir = path.join(tempBase, `sync-ts-project-refs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
      const { includePatterns, excludePatterns, rootConfig } = await parseWorkspace(workDir);
      const includeIndirectDeps = rootConfig.includeIndirectDeps ?? false;
      const solutionTsconfigPath = rootConfig.solutionTsconfigPath ?? './tsconfig.json';
      const packageJsons = await findAllPackageJsons(workDir, { includePatterns, excludePatterns });
      const packageMap = await buildPackageMap(packageJsons, false);

      // Update all packages
      for (const packageInfo of packageMap.values()) {
        await updatePackageReferences(packageInfo, packageMap, workDir, false, false, includeIndirectDeps);
      }

      // Update root tsconfig.json
      await updateRootTsconfig(workDir, packageMap, false, solutionTsconfigPath);

      // Compare with expected output - always preserve comments
      await compareDirectories(workDir, expectedDir);
    });

    it(`${testCase.name} - idempotent (no changes on second run)`, async () => {
      const inputDir = path.join(fixturesDir, testCase.dir, 'input');
      const workDir = path.join(tempDir, `${testCase.dir}-idempotent`);

      // Copy input to work directory
      await copyDir(inputDir, workDir);

      // Run the sync tool twice
      for (let i = 0; i < 2; i++) {
        const { includePatterns, excludePatterns, rootConfig } = await parseWorkspace(workDir);
        const includeIndirectDeps = rootConfig.includeIndirectDeps ?? false;
        const solutionTsconfigPath = rootConfig.solutionTsconfigPath ?? './tsconfig.json';
        const packageJsons = await findAllPackageJsons(workDir, { includePatterns, excludePatterns });
        const packageMap = await buildPackageMap(packageJsons, false);

        let changesCount = 0;
        for (const packageInfo of packageMap.values()) {
          const result = await updatePackageReferences(
            packageInfo,
            packageMap,
            workDir,
            false,
            false,
            includeIndirectDeps
          );
          changesCount += result.packagesUpdated;
        }

        // Update root tsconfig and check for changes
        const rootChanged = await updateRootTsconfig(workDir, packageMap, false, solutionTsconfigPath);

        if (i === 0) {
          // First run should make changes
          expect(changesCount > 0 || rootChanged).toBe(true);
        } else {
          // Second run should make no changes
          expect(changesCount).toBe(0);
          expect(rootChanged).toBe(false);
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
  const actualFiles = await getAllFiles(actualDir);

  // Check that all expected files exist and match
  for (const relativePath of expectedFiles) {
    const actualPath = path.join(actualDir, relativePath);
    const expectedPath = path.join(expectedDir, relativePath);

    // Check if file exists
    try {
      await fs.access(actualPath);
    } catch {
      throw new Error(`Expected file not found: ${relativePath}`);
    }

    // Compare file contents - always compare as exact text to preserve comments
    const actualContent = await fs.readFile(actualPath, 'utf-8');
    const expectedContent = await fs.readFile(expectedPath, 'utf-8');
    expect(actualContent).toBe(expectedContent);
  }

  // Check for unexpected extra files in actual directory
  const expectedSet = new Set(expectedFiles);
  const unexpectedFiles = actualFiles.filter((file) => !expectedSet.has(file));
  if (unexpectedFiles.length > 0) {
    throw new Error(`Unexpected files found in actual directory: ${unexpectedFiles.join(', ')}`);
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
