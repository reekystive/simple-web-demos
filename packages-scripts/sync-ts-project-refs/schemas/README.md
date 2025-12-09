# STSPR Configuration Schemas

JSON Schema definitions for STSPR configuration files, providing IDE autocomplete and validation support.

## Schema URLs

Use these URLs in your YAML configuration files for IDE support:

### Package-level Configuration

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/reekystive/simple-web-demos/main/packages-scripts/sync-ts-project-refs/schemas/tsconfig.stspr-package.schema.json

use-alter-tsconfig: false
exclude-this-package: false
# ... rest of configuration
```

**File**: `tsconfig.stspr-package.yaml` (place in package root)

### TypeScript Config-level Configuration

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/reekystive/simple-web-demos/main/packages-scripts/sync-ts-project-refs/schemas/tsconfig.stspr.schema.json

exclude-this-tsconfig: false
extra-refs:
  - { path: '../../test-utils/tsconfig.json' }
# ... rest of configuration
```

**Files**: `tsconfig.stspr.yaml`, `tsconfig.{name}.stspr.yaml`

### Root-level Configuration

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/reekystive/simple-web-demos/main/packages-scripts/sync-ts-project-refs/schemas/tsconfig.stspr-root.schema.json

include-indirect-deps: false
solution-tsconfig-path: ./tsconfig.json
```

**File**: `tsconfig.stspr-root.yaml` (place alongside `pnpm-workspace.yaml`)

## Editor Setup

Install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) in VS Code/Cursor for:

- ✅ Autocomplete for configuration keys
- ✅ Real-time validation
- ✅ Hover documentation
- ✅ Type checking

## Schema Files

- `tsconfig.stspr-package.schema.json` - Package-level configuration schema
- `tsconfig.stspr.schema.json` - TypeScript config-level configuration schema
- `tsconfig.stspr-root.schema.json` - Root-level configuration schema

Both schemas follow [JSON Schema Draft 07](https://json-schema.org/specification-links.html#draft-7) specification.
