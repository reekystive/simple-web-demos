/**
 * Package TypeScript configuration update logic
 */

import * as path from 'node:path';

import chalk from 'chalk';

import { calculateRelativePath, findSiblingTsconfigs, readTsConfig, writeTsConfig } from './fs-utils.js';
import { filterReferences } from './reference-merger.js';
import type { PackageInfo, Ref, TsconfigConfig } from './types.js';

/**
 * Build the dependency list for a package, optionally including transitive workspace deps.
 */
function collectWorkspaceDependencies(
  packageInfo: PackageInfo,
  packageMap: Map<string, PackageInfo>,
  includeIndirectDeps: boolean
): string[] {
  if (!includeIndirectDeps) {
    return packageInfo.workspaceDeps;
  }

  const allDeps = new Set<string>();
  const queue = [...packageInfo.workspaceDeps];

  while (queue.length > 0) {
    const depName = queue.shift();
    if (!depName) {
      continue;
    }

    if (depName === packageInfo.name || allDeps.has(depName)) {
      continue;
    }

    allDeps.add(depName);

    const depInfo = packageMap.get(depName);
    if (!depInfo) {
      continue;
    }

    for (const nextDep of depInfo.workspaceDeps) {
      if (!allDeps.has(nextDep) && nextDep !== packageInfo.name) {
        queue.push(nextDep);
      }
    }
  }

  return Array.from(allDeps);
}

/**
 * Update a single package's tsconfig.json with references
 */
export async function updatePackageReferences(
  packageInfo: PackageInfo,
  packageMap: Map<string, PackageInfo>,
  monorepoRoot: string,
  dryRun = false,
  verbose = false,
  includeIndirectDeps = false,
  excludedTsconfigs?: Set<string>
): Promise<{ packagesUpdated: number; tsconfigsUpdated: number }> {
  const { name, standardTsconfigPath, canonicalTsconfigPath, tsconfigConfigs, packageConfig, tsconfigPaths } =
    packageInfo;
  const workspaceDeps = collectWorkspaceDependencies(packageInfo, packageMap, includeIndirectDeps);

  const defaultTsconfigConfig: TsconfigConfig = {
    exclude: false,
    includeWorkspaceDeps: undefined,
    references: { add: [], skip: [] },
  };

  function getConfig(p: string): TsconfigConfig {
    return tsconfigConfigs.get(p) ?? defaultTsconfigConfig;
  }

  function resolveRefs(fromTsconfig: string, refs: Ref[]): { path: string }[] {
    return refs.map((ref) => ({
      path: calculateRelativePath(fromTsconfig, path.resolve(path.dirname(fromTsconfig), ref.path)),
    }));
  }

  function buildWorkspaceDepRefs(fromTsconfig: string): { path: string }[] {
    const refs: { path: string }[] = [];
    for (const depName of workspaceDeps) {
      const depInfo = packageMap.get(depName);
      if (!depInfo) {
        continue;
      }
      if (depInfo.packageConfig.exclude) {
        continue;
      }
      const relativePath = calculateRelativePath(fromTsconfig, depInfo.canonicalTsconfigPath);
      refs.push({ path: relativePath });
    }
    return refs;
  }

  async function buildCanonicalSiblingRefs(): Promise<{ path: string }[]> {
    if (!packageConfig.canonicalTsconfig.includeSiblings) {
      return [];
    }
    const relSiblings = await findSiblingTsconfigs(canonicalTsconfigPath, ['tsconfig.json']);
    const included = relSiblings.filter((rel) => {
      const abs = path.resolve(path.dirname(canonicalTsconfigPath), rel);
      if (excludedTsconfigs?.has(abs)) {
        return false;
      }
      const cfg = getConfig(abs);
      return !cfg.exclude;
    });
    return included.map((p) => ({ path: p }));
  }

  async function buildDesiredReferences(tsconfigPath: string, kind: 'standard' | 'canonical' | 'sibling') {
    const config = getConfig(tsconfigPath);
    if (excludedTsconfigs?.has(tsconfigPath)) {
      return { exclude: true, refs: [] as { path: string }[] };
    }
    if (config.exclude) {
      return { exclude: true, refs: [] as { path: string }[] };
    }

    const refs: { path: string }[] = [];

    // standard tsconfig.json discovery: optionally reference canonical
    if (kind === 'standard') {
      if (
        packageConfig.canonicalTsconfig.standardReferencesCanonical &&
        canonicalTsconfigPath !== standardTsconfigPath
      ) {
        refs.push({ path: calculateRelativePath(standardTsconfigPath, canonicalTsconfigPath) });
      }
    }

    // canonical discovery: optionally reference sibling tsconfig.*.json (excluding tsconfig.json)
    if (kind === 'canonical') {
      refs.push(...(await buildCanonicalSiblingRefs()));
    }

    // workspace deps
    const includeWorkspaceDeps =
      kind === 'canonical'
        ? packageConfig.canonicalTsconfig.includeWorkspaceDeps
        : (config.includeWorkspaceDeps ??
          (kind === 'standard' && canonicalTsconfigPath !== standardTsconfigPath ? false : true));
    if (includeWorkspaceDeps) {
      refs.push(...buildWorkspaceDepRefs(tsconfigPath));
    }

    // extra refs (package-level only applies to canonical)
    if (kind === 'canonical') {
      refs.push(...resolveRefs(tsconfigPath, packageConfig.references.add));
    }
    refs.push(...resolveRefs(tsconfigPath, config.references.add));

    // skip refs
    const skipRefs: Ref[] = [];
    if (kind === 'canonical') {
      skipRefs.push(...packageConfig.references.skip);
    }
    skipRefs.push(...config.references.skip);

    const filtered = filterReferences(refs, skipRefs, tsconfigPath);
    filtered.sort((a, b) => a.path.localeCompare(b.path));
    return { exclude: false, refs: filtered };
  }

  const targets = new Map<string, 'standard' | 'canonical' | 'sibling'>();
  targets.set(standardTsconfigPath, 'standard');
  // If canonical == standard, treat it as canonical so canonicalTsconfig.includeSiblings applies.
  targets.set(canonicalTsconfigPath, 'canonical');
  for (const p of tsconfigPaths) {
    if (!targets.has(p)) {
      targets.set(p, 'sibling');
    }
  }

  let tsconfigsUpdated = 0;
  let anyChanged = false;

  for (const [tsconfigPath, kind] of targets) {
    const desired = await buildDesiredReferences(tsconfigPath, kind);
    if (desired.exclude) {
      continue;
    }

    const tsconfig = await readTsConfig(tsconfigPath);
    const existingRefs = tsconfig.references ?? [];
    const existingPaths = new Set(existingRefs.map((r) => r.path));
    const newPaths = new Set(desired.refs.map((r) => r.path));

    const hasChanges =
      existingRefs.length !== desired.refs.length ||
      !Array.from(newPaths).every((p) => existingPaths.has(p)) ||
      !Array.from(existingPaths).every((p) => newPaths.has(p));

    if (!hasChanges) {
      continue;
    }

    if (desired.refs.length > 0) {
      tsconfig.references = desired.refs;
    } else {
      delete tsconfig.references;
    }

    const changed = await writeTsConfig(tsconfigPath, tsconfig, false, dryRun);
    if (changed) {
      tsconfigsUpdated++;
      anyChanged = true;
      if (verbose) {
        console.log(
          chalk.gray(
            `  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name}: updated ${path.relative(monorepoRoot, tsconfigPath)} (${desired.refs.length} refs)`
          )
        );
      }
    }
  }

  if (anyChanged && !verbose) {
    console.log(chalk.cyan(`  ${dryRun ? '[DRY RUN] ' : ''}✓ ${name}`));
  }

  return {
    packagesUpdated: anyChanged ? 1 : 0,
    tsconfigsUpdated,
  };
}
