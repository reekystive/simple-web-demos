# Test Case 04: Extra Refs from tsconfig.stspr.yaml

## Purpose

This test case verifies that:

1. **Extra references from `tsconfig.stspr.yaml` are correctly added** to the main tsconfig.json
2. **The tool is idempotent** - running it multiple times doesn't cause repeated updates
3. **Order-independent comparison works** - references with the same content but different order don't trigger updates

## Scenario

- `@test/utils` package has a `tsconfig.stspr.yaml` that adds an extra reference to `../app/tsconfig.json`
- The main `tsconfig.json` should include both:
  - Sibling reference: `./tsconfig.web.json`
  - Extra reference: `../app/tsconfig.json`

## Bug This Tests

Before the fix, the tool would:

1. First run: Add extra-ref to the end of references array
2. Second run: Regenerate references (without extra-ref), then add extra-ref again
3. This caused the order to change, triggering an update even though content was the same

The fix uses **order-independent set comparison** to detect changes, only sorting when actually updating.

## Expected Behavior

- First run: Updates are made to add the extra reference
- Second run: No updates (idempotent) ✅
- Third run: Still no updates ✅
