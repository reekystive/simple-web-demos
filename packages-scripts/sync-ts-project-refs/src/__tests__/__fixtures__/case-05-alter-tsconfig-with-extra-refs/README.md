# Test Case 05: Canonical TSConfig with Extra Refs

## Purpose

This test case verifies that:

1. **Extra references work correctly when canonical tsconfig is not tsconfig.json**
2. **Tsconfig-level references.add is added to tsconfig.json** (not just package-level)
3. **The tool is idempotent** - running it multiple times doesn't cause repeated updates
4. **Order-independent comparison works** in canonical mode

## Scenario

- `@test/utils` package sets `canonicalTsconfig.path: ./tsconfig.tsserver.json`
- It has a `tsconfig.stspr.yaml` that uses `references.add` to add `../app/tsconfig.json`
- The main `tsconfig.json` should include:
  - Reference to canonical tsconfig: `./tsconfig.tsserver.json`
  - Extra reference: `../app/tsconfig.json`

## Bug This Tests

Before the v2 refactor, this was handled via a separate extra-refs merge step, which could lead to non-idempotent behavior.

In v2, all references are computed in one pass using `references.add/skip`, so config-driven references are stable and idempotent.

## Expected Behavior

- First run: Updates are made to add the extra reference
- Second run: No updates (idempotent) ✅
- Third run: Still no updates ✅
