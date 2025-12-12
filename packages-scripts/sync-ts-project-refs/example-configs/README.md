# stspr Configuration Examples

This directory contains example configuration files for the Sync TypeScript Project References (stspr) tool.

## Files

### `stspr.root.yaml`

Root-level configuration that controls behavior for the entire workspace.

**Location**: Place in the workspace root directory (same level as `pnpm-workspace.yaml`)

**Purpose**:

- Configure indirect dependency handling
- Configure global hard-excludes (glob patterns with `!glob` support)
- Configure the root solution tsconfig target and its extra/skipped references

### `stspr.package.yaml`

Package-level configuration that controls how the entire package is processed by the stspr tool.

**Location**: Place in the package root directory (same level as `package.json`)

**Purpose**:

- Exclude a package from processing
- Configure the canonical tsconfig for the package (what other packages should reference)
- Control dependency scanning behavior
- Add/skip references that apply only to the canonical tsconfig

### `tsconfig.stspr.yaml`

TypeScript config-level configuration that controls how a specific `tsconfig.json` file is processed.

**Location**: Place in the same directory as the corresponding TypeScript configuration file

**Naming Convention**:

- For `tsconfig.json` → `tsconfig.stspr.yaml`
- For `tsconfig.build.json` → `tsconfig.build.stspr.yaml`
- For `tsconfig.test.json` → `tsconfig.test.stspr.yaml`
- For `tsconfig.{name}.json` → `tsconfig.{name}.stspr.yaml`

**Purpose**:

- Exclude a specific tsconfig from processing
- Decide whether this specific tsconfig should include workspace dependency references
- Add/skip references for a specific tsconfig file

## Quick Start

1. **Copy the example files** to your package directory:

   ```bash
   # Package-level config
   cp example-configs/stspr.package.yaml your-package/

   # TypeScript config-level config (optional)
   cp example-configs/tsconfig.stspr.yaml your-package/
   ```

2. **Customize the configurations** according to your needs:
   - Remove sections you don't need
   - Update paths to match your project structure
   - Adjust boolean flags based on your requirements

3. **Test your configuration**:

   ```bash
   # Preview changes
   tsx scripts/monorepo/sync-ts-project-refs --dry-run --verbose

   # Apply changes
   tsx scripts/monorepo/sync-ts-project-refs
   ```

## Configuration Hierarchy

The tool applies configurations in this order (later overrides earlier):

1. **Default behavior**: Workspace dependencies become project references
2. **Package-level config**: `stspr.package.yaml`
3. **TypeScript config-level config**: `tsconfig.stspr.yaml`

## Common Use Cases

### Exclude Package from Reference Graph

```yaml
# stspr.package.yaml
exclude: true
```

### Add External References

```yaml
# stspr.package.yaml
references:
  add:
    - { path: '../../external-packages/shared-types/tsconfig.json' }
  skip: []
```

### Skip Problematic Dependencies

```yaml
# stspr.package.yaml
references:
  add: []
  skip:
    - { path: '../problematic-package/tsconfig.json' }
```

### Exclude Specific TypeScript Config

```yaml
# tsconfig.build.stspr.yaml
exclude: true
```

### Test-Specific Configuration

```yaml
# tsconfig.test.stspr.yaml
includeWorkspaceDeps: true
references:
  add:
    - { path: '../../test-utils/tsconfig.json' }
  skip:
    - { path: '../production-only/tsconfig.json' }
```

## Migration from Legacy System

If you're migrating from the old system:

- **`tsconfig.*.extra-refs.json`** → Use `references.add` in YAML configs
- **`tsconfig-nosync.mark`** → Use `exclude: true` in `stspr.package.yaml`
- **`tsconfig.*.nosync.*.json`** → Use `exclude: true` in `tsconfig.*.stspr.yaml`

## Validation and Debugging

The tool uses Zod for configuration validation, providing clear error messages for invalid configurations.

**Debugging tips**:

- Use `--verbose` flag to see detailed processing information
- Use `--dry-run` to preview changes without applying them
- Check the generated `references` array in your tsconfig files
- Paths in config files are relative to the config file's directory

## Support

For more information, run:

```bash
tsx scripts/monorepo/sync-ts-project-refs --help
```
