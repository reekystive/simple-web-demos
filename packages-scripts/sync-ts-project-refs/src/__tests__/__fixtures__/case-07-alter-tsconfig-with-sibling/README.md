# Test Case 07: Alter TSConfig with Sibling TSConfig Files

## Scenario

This test verifies the behavior when using `use-alter-tsconfig` with multiple tsconfig files including sibling configs.

## Setup

- Package `app` depends on package `utils`
- Package `app` has:
  - `tsconfig.json` (original main config)
  - `tsconfig.tsserver.json` (designated as the alter/main config)
  - `tsconfig.custom.json` (sibling config)
- Package `app` has configuration:

  ```yaml
  use-alter-tsconfig: true
  alter-tsconfig-path: ./tsconfig.tsserver.json
  ```

## Expected Behavior

When `use-alter-tsconfig` is enabled:

1. **Root `tsconfig.json`**: Should reference `tsconfig.tsserver.json` (the alter config), not the original `tsconfig.json`

2. **Package `app/tsconfig.json`**: Should ONLY reference `tsconfig.tsserver.json` (the alter config)
   - It should NOT reference workspace dependencies
   - It should NOT reference sibling configs

3. **Package `app/tsconfig.tsserver.json`**: Becomes the "main" config and should reference:
   - Workspace dependencies (`../utils/tsconfig.json`)
   - Sibling configs (`./tsconfig.custom.json`)

4. **Package `app/tsconfig.custom.json`**: Should have no references (it's a sibling config)

## Key Point

When using alter tsconfig, the alter config (e.g., `tsconfig.tsserver.json`) becomes the new "main" config that:

- Gets referenced by other packages
- Gets referenced by the root tsconfig
- Receives all workspace dependency references
- Receives all sibling tsconfig references

The original `tsconfig.json` becomes a simple wrapper that only references the alter config.
