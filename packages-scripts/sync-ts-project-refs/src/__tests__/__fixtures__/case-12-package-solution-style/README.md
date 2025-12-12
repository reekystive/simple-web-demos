# Test Case 12: Package-level solution-style

This fixture tests package-level solution-style behavior:

- `packages/app` sets `canonicalTsconfig.includeWorkspaceDeps: false` in `stspr.package.yaml`
- `packages/app/tsconfig.json` should reference only sibling tsconfigs: `./tsconfig.web.json` and `./tsconfig.tests.json`
- `packages/app/tsconfig.web.json` and `packages/app/tsconfig.tests.json` should include workspace deps
- `packages/app/tsconfig.tests.stspr.yaml` uses `references.add` to add extra ref to `./tsconfig.web.json`
- Root solution should reference only `packages/*/tsconfig.json`
