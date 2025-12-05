# Test Case 05: Alter-Tsconfig with Extra Refs

## Purpose

This test case verifies that:

1. **Extra references work correctly in alter-tsconfig mode**
2. **Tsconfig-level extra-refs are added to main tsconfig.json** (not just package-level)
3. **The tool is idempotent** - running it multiple times doesn't cause repeated updates
4. **Order-independent comparison works** in alter-tsconfig mode

## Scenario

- `@test/utils` package uses **alter-tsconfig mode** (`use-alter-tsconfig: true`)
- It has a `tsconfig.stspr.yaml` that adds an extra reference to `../app/tsconfig.json`
- The main `tsconfig.json` should include:
  - Reference to alter-tsconfig: `./tsconfig.tsserver.json`
  - Extra reference: `../app/tsconfig.json`

## Bug This Tests

Before the fix, in alter-tsconfig mode:

1. First run: `package-updater.ts` updates main tsconfig with only `./tsconfig.tsserver.json`
2. Then `mergeExtraRefs` adds the extra-ref `../app/tsconfig.json`
3. Second run: `package-updater.ts` regenerates references (only `./tsconfig.tsserver.json`), **overwriting the extra-ref**
4. Then `mergeExtraRefs` detects it's missing and adds it again → reports "1 new"
5. This cycle repeats infinitely

The fix adds tsconfig-level extra-refs **during the initial reference generation** in `package-updater.ts`, so they're not overwritten.

## Expected Behavior

- First run: Updates are made to add the extra reference
- Second run: No updates (idempotent) ✅
- Third run: Still no updates ✅
