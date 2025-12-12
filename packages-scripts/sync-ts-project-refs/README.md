# STSPR (sync-ts-project-refs)

STSPR is a **monorepo tool** that keeps **TypeScript project references** (`references`) in sync with your **pnpm workspace dependencies** (`workspace:*`).

It scans your workspace packages, reads `package.json` dependency graphs, and updates each package’s `tsconfig.json` (and optional `tsconfig.*.json`) so that TypeScript builds and editor tooling can understand project boundaries.

## What it does

- **Adds/removes `references`** in tsconfig files based on `workspace:*` dependencies
- **Supports solution-style root aggregation** (a root “solution” tsconfig that references all packages)
- **Supports per-package canonical tsconfig** (what other packages should reference)
- **Supports per-tsconfig overrides** (extra/skip refs, include deps refs, exclude a tsconfig)
- **Preserves comments** in `tsconfig.json` (JSONC)
- **Supports CI checks** (`--check`) and previews (`--dry-run`)

## Requirements

- A pnpm workspace with `pnpm-workspace.yaml`
- Packages that should participate must have a `tsconfig.json`
- Workspace dependencies must use `workspace:*` (or other `workspace:` ranges)

## Installation

This package is designed to run inside a monorepo. It provides a bin:

- `sync-ts-project-refs` → `dist/index.js`

In this repository you typically run it via pnpm:

```bash
pnpm -C packages-scripts/sync-ts-project-refs start -- --help
```

Or during development:

```bash
pnpm -C packages-scripts/sync-ts-project-refs dev -- --help
```

## CLI usage

### Run

```bash
sync-ts-project-refs
```

### Preview changes

```bash
sync-ts-project-refs --dry-run --verbose
```

### CI check (no writes, non-zero if changes needed)

```bash
sync-ts-project-refs --check
```

### Options

- **`--help, -h`**: show help
- **`--dry-run, -d`**: compute changes but do not write files
- **`--check`**: verify no changes needed (like `--dry-run` + fail if changes would be made)
- **`--verbose, -v`**: print detailed processing info
- **`--workspace-root, -r <path>`**: run against a specific workspace root (otherwise auto-detect via searching for `pnpm-workspace.yaml`)

## Configuration files (v2)

All config keys are **camelCase**.

### Root config: `stspr.root.yaml`

**Location**: workspace root (next to `pnpm-workspace.yaml`)

**Purpose**:

- Configure transitive deps handling
- Configure global hard excludes (packages / tsconfigs)
- Configure which root solution tsconfig to update, and add/skip refs on that file

```yaml
# yaml-language-server: $schema=./packages-scripts/sync-ts-project-refs/schemas/stspr.root.schema.json

graph:
  includeIndirectDeps: false

filters:
  # pnpm-workspace style glob patterns, supports "!glob"
  # If a path matches, it is HARD excluded regardless of per-package/per-tsconfig config.
  excludePackages: []
  excludeTsconfigs: []

rootSolution:
  # Root solution tsconfig to update. If it doesn't exist, STSPR skips root updating.
  tsconfigPath: ./tsconfig.json
  # Include sibling root tsconfig.*.json as references (discovery)
  includeSiblings: true
  # References that apply ONLY to the root solution tsconfig file
  references:
    add: []
    skip: []
```

### Package config: `stspr.package.yaml`

**Location**: package root (next to `package.json`)

**Purpose**:

- Exclude a package from processing
- Configure canonical tsconfig (what other packages should reference)
- Control which dependency sections are treated as reference edges
- Add/skip references that apply only to the canonical tsconfig

```yaml
# yaml-language-server: $schema=./packages-scripts/sync-ts-project-refs/schemas/stspr.package.schema.json

exclude: false

canonicalTsconfig:
  # Default: ./tsconfig.json
  path: ./tsconfig.json
  includeSiblings: true
  # Derived default:
  # - path != ./tsconfig.json => true
  # - path == ./tsconfig.json => false
  # standardReferencesCanonical: true
  includeWorkspaceDeps: true

dependencies:
  include:
    dependencies: true
    devDependencies: true
    optionalDependencies: true

references:
  add: []
  skip: []
```

### Tsconfig-level config: `tsconfig.stspr.yaml` / `tsconfig.{name}.stspr.yaml`

**Location**: same directory as the corresponding `tsconfig*.json`

**Naming**:

- `tsconfig.json` → `tsconfig.stspr.yaml`
- `tsconfig.web.json` → `tsconfig.web.stspr.yaml`
- `tsconfig.custom.json` → `tsconfig.custom.stspr.yaml`

```yaml
# yaml-language-server: $schema=./packages-scripts/sync-ts-project-refs/schemas/tsconfig.stspr.schema.json

exclude: false

# If not set, STSPR derives a sensible default based on whether the file is
# canonical/standard/sibling. You can override explicitly:
#
# - true  => this tsconfig will include workspace dependency references
# - false => it won't
#
# includeWorkspaceDeps: true

references:
  add: []
  skip: []
```

## How references are computed (high-level)

For each package:

- **Standard tsconfig**: `tsconfig.json`
  - If `canonicalTsconfig.standardReferencesCanonical` is true and canonical is not `tsconfig.json`,
    STSPR adds a reference from `tsconfig.json` → canonical.

- **Canonical tsconfig**: `canonicalTsconfig.path` (default `./tsconfig.json`)
  - If `canonicalTsconfig.includeSiblings` is true, STSPR references sibling `tsconfig.*.json` files (excluding `tsconfig.json`)
  - If `canonicalTsconfig.includeWorkspaceDeps` is true, STSPR adds workspace dependency references
  - Applies `stspr.package.yaml` `references.add/skip` (canonical only)
  - Applies matching `tsconfig.*.stspr.yaml` `references.add/skip`

- **Sibling tsconfigs**: other `tsconfig.*.json` files in the package directory
  - Optional `includeWorkspaceDeps` can be set per-tsconfig in `tsconfig.*.stspr.yaml`
  - Applies tsconfig-level `references.add/skip`

## JSON schemas (YAML IDE support)

This project ships JSON schemas for IDE autocomplete/validation.

### Schema URLs (raw GitHub)

- `stspr.root.yaml` schema: `schemas/stspr.root.schema.json`
- `stspr.package.yaml` schema: `schemas/stspr.package.schema.json`
- `tsconfig.*.stspr.yaml` schema: `schemas/tsconfig.stspr.schema.json`

See `schemas/README.md` for ready-to-copy `$schema=` lines.

## Common recipes

### Non-standard canonical tsconfig (e.g. `tsconfig.tsserver.json`)

```yaml
# stspr.package.yaml
canonicalTsconfig:
  path: ./tsconfig.tsserver.json
  includeSiblings: true
  includeWorkspaceDeps: true
```

### Exclude a package entirely

```yaml
# stspr.package.yaml
exclude: true
```

### Hard-exclude packages or generated tsconfigs globally

```yaml
# stspr.root.yaml
filters:
  excludePackages:
    - 'packages/legacy-*'
    - '!packages/legacy-keep'
  excludeTsconfigs:
    - '**/tsconfig.generated.json'
```

### Add/skip references only on the root solution tsconfig

```yaml
# stspr.root.yaml
rootSolution:
  references:
    add:
      - { path: './configs/tsconfig.shared.json' }
    skip:
      - { path: './packages/utils/tsconfig.json' }
```

## Troubleshooting

### “Why didn’t root tsconfig update?”

- If `rootSolution.tsconfigPath` does not exist, STSPR **skips root updating** (by design).
- If packages are missing `tsconfig.json`, they are skipped.
- If a package matches `filters.excludePackages`, it is hard-excluded.

### “My editor doesn’t autocomplete YAML keys”

Ensure the YAML file includes the `$schema` comment and you have a YAML extension enabled:

- VS Code YAML extension: `redhat.vscode-yaml`

## Development

```bash
pnpm -C packages-scripts/sync-ts-project-refs test
pnpm -C packages-scripts/sync-ts-project-refs run lint:eslint
```
