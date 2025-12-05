# STSPR Configuration Schemas

This directory contains JSON Schema definitions for the Sync TypeScript Project References (STSPR) configuration files.

## Schema Files

### `tsconfig.stspr-package.schema.json`

JSON Schema for package-level configuration (`tsconfig.stspr-package.yaml`).

**Validates**: Package-level settings that control how the entire package is processed by the STSPR tool.

**Configuration File**: `tsconfig.stspr-package.yaml` (placed in package root)

### `tsconfig.stspr.schema.json`

JSON Schema for TypeScript config-level configuration (`tsconfig.stspr.yaml` and variants).

**Validates**: Config-level settings that control how a specific `tsconfig.json` file is processed.

**Configuration Files**:

- `tsconfig.stspr.yaml`
- `tsconfig.{name}.stspr.yaml`

## Usage

### YAML Configuration with Schema Validation

Add the schema reference at the top of your YAML configuration files:

#### Package-level Configuration

```yaml
# yaml-language-server: $schema=./schemas/tsconfig.stspr-package.schema.json

use-alter-tsconfig: false
alter-tsconfig-path: ./tsconfig.tsserver.json
exclude-this-package: false
# ... rest of configuration
```

#### TypeScript Config-level Configuration

```yaml
# yaml-language-server: $schema=./schemas/tsconfig.stspr.schema.json

exclude-this-tsconfig: false
extra-refs:
  - { path: '../../test-utils/tsconfig.json' }
skip-refs:
  - { path: '../problematic-package/tsconfig.json' }
```

### Editor Support

Most modern editors with YAML support will automatically provide:

- **Autocomplete**: Suggestions for configuration keys
- **Validation**: Real-time error checking
- **Documentation**: Hover tooltips with property descriptions
- **Type checking**: Ensures correct value types (boolean, string, array, etc.)

#### VS Code / Cursor

Install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) for full schema support.

#### JetBrains IDEs

Built-in YAML support with JSON Schema validation.

### Programmatic Validation

You can also validate configuration files programmatically using any JSON Schema validator:

```typescript
import Ajv from 'ajv';
import * as fs from 'fs';
import * as yaml from 'yaml';

const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync('./schemas/tsconfig.stspr-package.schema.json', 'utf-8'));
const config = yaml.parse(fs.readFileSync('./tsconfig.stspr-package.yaml', 'utf-8'));

const validate = ajv.compile(schema);
const valid = validate(config);

if (!valid) {
  console.error('Validation errors:', validate.errors);
}
```

## Schema Specification

Both schemas follow [JSON Schema Draft 07](https://json-schema.org/specification-links.html#draft-7) specification.

### Key Features

- **Type Safety**: All properties have defined types (boolean, string, array, object)
- **Default Values**: Default values are documented for all properties
- **Descriptions**: Comprehensive descriptions for each property
- **Examples**: Practical examples for string and path values
- **No Additional Properties**: Schemas are strict and don't allow undefined properties
- **Required Fields**: References objects require the `path` property

## Validation Rules

### Package-level Configuration (`tsconfig.stspr-package.schema.json`)

- All boolean flags default to `false`
- `alter-tsconfig-path` must be a string (default: `"./tsconfig.tsserver.json"`)
- `extra-refs` and `skip-refs` must be arrays of objects with `path` property
- No additional properties allowed at root level

### TypeScript Config-level Configuration (`tsconfig.stspr.schema.json`)

- `exclude-this-tsconfig` defaults to `false`
- `extra-refs` and `skip-refs` must be arrays of objects with `path` property
- No additional properties allowed at root level

## Schema Updates

When updating the schemas:

1. Ensure backward compatibility when possible
2. Update the `$id` field if making breaking changes
3. Update this README with any new validation rules
4. Test schemas with example configuration files
5. Update the corresponding example configuration files in `../example-configs/`

## Related Files

- **Example Configs**: `../example-configs/` - Example configuration files with detailed comments
- **Documentation**: `../example-configs/README.md` - Usage guide for configuration files

## Support

For issues or questions about the schemas:

1. Check the example configurations in `../example-configs/`
2. Validate your configuration files using the schemas
3. Run the tool with `--verbose` flag for detailed error messages
