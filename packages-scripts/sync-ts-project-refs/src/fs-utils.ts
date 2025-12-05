/**
 * File system utilities for TypeScript configuration management
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import fg from 'fast-glob';

import type { TsConfig, WorkspaceConfig } from './types.js';

/**
 * Find all package.json files in the workspace
 */
export async function findAllPackageJsons(
  monorepoRoot: string,
  { includePatterns, excludePatterns }: WorkspaceConfig
): Promise<string[]> {
  const patterns = includePatterns.map((p) => path.join(p, 'package.json'));

  const files = await fg(patterns, {
    cwd: monorepoRoot,
    absolute: true,
    ignore: excludePatterns.map((p) => path.join(p, '**')),
  });

  return files;
}

/**
 * Strip JSON comments from a string
 * More robust implementation that handles edge cases
 */
export function stripJsonComments(jsonString: string): string {
  let result = '';
  let inString = false;
  let inSingleComment = false;
  let inMultiComment = false;
  let escapeNext = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1];

    // Handle escape sequences in strings
    if (escapeNext) {
      if (inString && !inSingleComment && !inMultiComment) {
        result += char ?? '';
      }
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      result += char;
      continue;
    }

    // Handle string boundaries
    if (char === '"' && !inSingleComment && !inMultiComment) {
      inString = !inString;
      result += char;
      continue;
    }

    // Skip everything if we're in a string
    if (inString) {
      result += char ?? '';
      continue;
    }

    // Handle multi-line comment end
    if (inMultiComment) {
      if (char === '*' && nextChar === '/') {
        inMultiComment = false;
        i++; // Skip the '/'
      }
      continue;
    }

    // Handle single-line comment end
    if (inSingleComment) {
      if (char === '\n' || char === '\r') {
        inSingleComment = false;
        result += char; // Keep the newline
      }
      continue;
    }

    // Check for comment start
    if (char === '/') {
      if (nextChar === '/') {
        inSingleComment = true;
        i++; // Skip the second '/'
        continue;
      }
      if (nextChar === '*') {
        inMultiComment = true;
        i++; // Skip the '*'
        continue;
      }
    }

    result += char ?? '';
  }

  // Remove trailing commas before closing braces/brackets
  result = result.replace(/,(\s*[}\]])/g, '$1');

  return result;
}

/**
 * Read and parse tsconfig.json (with comment support)
 */
export async function readTsConfig(tsconfigPath: string): Promise<TsConfig> {
  const content = await fs.readFile(tsconfigPath, 'utf-8');
  const stripped = stripJsonComments(content);
  return JSON.parse(stripped) as TsConfig;
}

/**
 * Write tsconfig.json with proper formatting
 * Returns true if the file was actually changed
 */
export async function writeTsConfig(
  tsconfigPath: string,
  config: TsConfig,
  isSolutionStyle = false
): Promise<boolean> {
  let content = '';

  // Add comment for solution-style tsconfig
  if (isSolutionStyle) {
    content += '// Solution-style tsconfig for TypeScript project references\n';
    content += '// This file orchestrates all workspace packages\n';
  }

  content += `${JSON.stringify(config, null, 2)}\n`;

  // Format with prettier to get the final content
  const formattedContent = await formatWithPrettier(content, tsconfigPath);

  // Check if file content would actually change
  try {
    const existingContent = await fs.readFile(tsconfigPath, 'utf-8');
    if (existingContent === formattedContent) {
      // No changes needed
      return false;
    }
  } catch {
    // File doesn't exist, will be created
  }

  // Write the formatted content
  await fs.writeFile(tsconfigPath, formattedContent, 'utf-8');
  return true;
}

/**
 * Format content with prettier
 * Returns the formatted content
 */
async function formatWithPrettier(content: string, filePath: string): Promise<string> {
  try {
    const prettier = await import('prettier');
    const options = await prettier.resolveConfig(filePath);
    return await prettier.format(content, {
      ...options,
      filepath: filePath,
    });
  } catch {
    // If prettier fails, return original content
    return content;
  }
}

/**
 * Calculate relative path from one tsconfig to another
 */
export function calculateRelativePath(fromTsconfig: string, toTsconfig: string): string {
  const fromDir = path.dirname(fromTsconfig);
  let relativePath = path.relative(fromDir, toTsconfig);

  // Ensure forward slashes for cross-platform compatibility
  relativePath = relativePath.replace(/\\/g, '/');

  // Ensure path starts with ./ or ../
  if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

/**
 * Find all tsconfig.*.json files in the same directory
 * @param tsconfigPath - The tsconfig file to find siblings for
 * @param excludeFiles - Additional files to exclude (besides the main file itself)
 */
export async function findSiblingTsconfigs(tsconfigPath: string, excludeFiles: string[] = []): Promise<string[]> {
  const dir = path.dirname(tsconfigPath);
  const basename = path.basename(tsconfigPath);
  const excludeSet = new Set([basename, ...excludeFiles]);

  try {
    const files = await fs.readdir(dir);
    const siblingTsconfigs = files
      .filter(
        (f) => f.startsWith('tsconfig.') && f.endsWith('.json') && !excludeSet.has(f) // Exclude the main file and any additional excludes
      )
      .map((f) => `./${f}`); // Use relative path from the tsconfig directory

    return siblingTsconfigs.sort();
  } catch {
    return [];
  }
}
