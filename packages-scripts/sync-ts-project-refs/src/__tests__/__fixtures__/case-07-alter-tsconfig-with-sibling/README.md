# Test Case 07: Canonical TSConfig with Sibling TSConfig Files

## Scenario

This test verifies the behavior when using `canonicalTsconfig.path` with multiple tsconfig files including sibling configs.

## Setup

- Package `app` depends on package `utils`
- Package `app` has:
  - `tsconfig.json` (original main config)
  - `tsconfig.canonical.json` (designated as the canonical config)
  - `tsconfig.custom.json` (sibling config)
- Package `app` has configuration:

  ```yaml
  canonicalTsconfig:
    path: ./tsconfig.canonical.json
  ```

## Expected Behavior

When `canonicalTsconfig.path` is set:

1. **Root `tsconfig.json`**: Should reference `tsconfig.canonical.json` (the canonical config), not the original `tsconfig.json`

2. **Package `app/tsconfig.json`**: Should reference `tsconfig.canonical.json` (the canonical config)
   - It should NOT reference workspace dependencies
   - It should NOT reference sibling configs

3. **Package `app/tsconfig.canonical.json`**: Becomes the canonical config and should reference:
   - Workspace dependencies (`../utils/tsconfig.json`)
   - Sibling configs (`./tsconfig.custom.json`)

4. **Package `app/tsconfig.custom.json`**: Should have no references (it's a sibling config)

## Key Point

When using a canonical tsconfig, the canonical config (e.g., `tsconfig.canonical.json`) becomes the config that:

- Gets referenced by other packages
- Gets referenced by the root tsconfig
- Receives all workspace dependency references
- Receives all sibling tsconfig references

The original `tsconfig.json` becomes a simple wrapper that references the canonical config.
