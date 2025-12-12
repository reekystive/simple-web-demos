/**
 * Global filter helpers for stspr (hard excludes).
 *
 * Patterns are pnpm-workspace style globs and support "!glob" to un-exclude.
 */

import * as path from 'node:path';

import { globby } from 'globby';

/**
 * Resolve excluded directories from glob patterns.
 */
export async function resolveExcludedDirs(workspaceRoot: string, patterns: string[]): Promise<Set<string>> {
  if (patterns.length === 0) {
    return new Set();
  }

  const dirs = await globby(patterns, {
    cwd: workspaceRoot,
    absolute: true,
    onlyDirectories: true,
    expandDirectories: false,
    gitignore: true,
  });

  return new Set(dirs.map((p) => path.resolve(p)));
}

/**
 * Resolve excluded files from glob patterns.
 */
export async function resolveExcludedFiles(workspaceRoot: string, patterns: string[]): Promise<Set<string>> {
  if (patterns.length === 0) {
    return new Set();
  }

  const files = await globby(patterns, {
    cwd: workspaceRoot,
    absolute: true,
    onlyFiles: true,
    expandDirectories: false,
    gitignore: true,
  });

  return new Set(files.map((p) => path.resolve(p)));
}

export function isExcludedByDirSet(absolutePath: string, excludedDirs: Set<string>): boolean {
  const p = path.resolve(absolutePath);
  return excludedDirs.has(p);
}

export function isExcludedByFileSet(absolutePath: string, excludedFiles: Set<string>): boolean {
  const p = path.resolve(absolutePath);
  return excludedFiles.has(p);
}
