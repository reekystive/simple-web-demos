# Test Case 06: Preserve Comments

This test case verifies that comments in tsconfig.json files are preserved when updating references.

## Setup

- Two packages: `@test/utils` and `@test/app`
- `@test/app` depends on `@test/utils`
- Both packages have tsconfig.json files with comments

## Expected Behavior

1. Comments in tsconfig.json should be preserved after updating references
2. The tool should add the reference to `@test/utils` in `@test/app`'s tsconfig.json
3. All existing comments should remain intact

## Files

### Input

- `packages/utils/tsconfig.json`: Has comments about config and compiler options
- `packages/app/tsconfig.json`: Has comments about app configuration and references

### Expected

- `packages/app/tsconfig.json`: Should have the reference to utils added while preserving all comments
- Comments should remain in the same positions relative to the JSON structure
