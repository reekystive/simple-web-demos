# STSPR Configuration Examples

This directory contains example configuration files for the Sync TypeScript Project References (STSPR) tool.

## Files

### `stspr.root.yaml`

Root-level configuration that controls behavior for the entire workspace.

**Location**: Place in the workspace root directory (same level as `pnpm-workspace.yaml`)

**Purpose**:

- Choose which solution-style tsconfig should receive workspace references
- Toggle whether indirect (transitive) workspace dependencies should also be added as TypeScript project references

### `stspr.package.yaml`

Package-level configuration that controls how the entire package is processed by the STSPR tool.

**Location**: Place in the package root directory (same level as `package.json`)

**Purpose**:

- Configure alternative TypeScript configurations
- Control dependency scanning behavior
- Manage package-level references and exclusions
- Exclude entire packages from the reference graph

### `tsconfig.stspr.yaml`

TypeScript config-level configuration that controls how a specific `tsconfig.json` file is processed.

**Location**: Place in the same directory as the corresponding TypeScript configuration file

**Naming Convention**:

- For `tsconfig.json` → `tsconfig.stspr.yaml`
- For `tsconfig.build.json` → `tsconfig.build.stspr.yaml`
- For `tsconfig.test.json` → `tsconfig.test.stspr.yaml`
- For `tsconfig.{name}.json` → `tsconfig.{name}.stspr.yaml`

**Purpose**:

- Add or skip references for specific TypeScript configurations
- Exclude specific tsconfig files from processing
- Fine-tune references for different build scenarios (test, build, IDE, etc.)

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

### Use Alternative TypeScript Configuration

```yaml
# stspr.package.yaml
use-alter-tsconfig: true
alter-tsconfig-path: ./tsconfig.tsserver.json
```

### Exclude Package from Reference Graph

```yaml
# stspr.package.yaml
exclude-this-package: true
```

### Add External References

```yaml
# stspr.package.yaml
extra-refs:
  - { path: '../../external-packages/shared-types/tsconfig.json' }
```

### Skip Problematic Dependencies

```yaml
# stspr.package.yaml
skip-refs:
  - { path: '../problematic-package/tsconfig.json' }
```

### Exclude Specific TypeScript Config

```yaml
# tsconfig.build.stspr.yaml
exclude-this-tsconfig: true
```

### Test-Specific Configuration

```yaml
# tsconfig.test.stspr.yaml
extra-refs:
  - { path: '../../test-utils/tsconfig.json' }
skip-refs:
  - { path: '../production-only/tsconfig.json' }
```

## Migration from Legacy System

If you're migrating from the old system:

- **`tsconfig.*.extra-refs.json`** → Use `extra-refs` in YAML configs
- **`tsconfig-nosync.mark`** → Use `exclude-this-package: true`
- **`tsconfig.*.nosync.*.json`** → Use `exclude-this-tsconfig: true`

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
