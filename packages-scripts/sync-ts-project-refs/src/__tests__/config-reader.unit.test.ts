import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readPackageConfig, readRootConfig, readTsconfigConfig } from '../config-reader.js';

describe('config-reader (unit)', () => {
  it('derives standardReferencesCanonical from canonicalTsconfig.path when not explicitly provided', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stspr-config-reader-'));

    await fs.writeFile(
      path.join(dir, 'stspr.package.yaml'),
      ['canonicalTsconfig:', '  path: ./tsconfig.canonical.json'].join('\n'),
      'utf-8'
    );

    const cfg = await readPackageConfig(dir);
    expect(cfg.canonicalTsconfig.path).toBe('./tsconfig.canonical.json');
    expect(cfg.canonicalTsconfig.standardReferencesCanonical).toBe(true);
  });

  it('defaults canonicalTsconfig.path to ./tsconfig.json and standardReferencesCanonical to false', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stspr-config-reader-'));
    const cfg = await readPackageConfig(dir);
    expect(cfg.canonicalTsconfig.path).toBe('./tsconfig.json');
    expect(cfg.canonicalTsconfig.standardReferencesCanonical).toBe(false);
  });

  it('parses rootSolution references add/skip', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stspr-config-reader-'));

    await fs.writeFile(
      path.join(dir, 'stspr.root.yaml'),
      [
        'rootSolution:',
        '  references:',
        '    add:',
        "      - { path: './configs/tsconfig.shared.json' }",
        '    skip:',
        "      - { path: './packages/utils/tsconfig.json' }",
      ].join('\n'),
      'utf-8'
    );

    const cfg = await readRootConfig(dir);
    expect(cfg.rootSolution.references.add).toEqual([{ path: './configs/tsconfig.shared.json' }]);
    expect(cfg.rootSolution.references.skip).toEqual([{ path: './packages/utils/tsconfig.json' }]);
  });

  it('parses tsconfig-level v2 fields', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stspr-config-reader-'));
    const tsconfigPath = path.join(dir, 'tsconfig.web.json');
    await fs.writeFile(tsconfigPath, '{}', 'utf-8');

    await fs.writeFile(
      path.join(dir, 'tsconfig.web.stspr.yaml'),
      ['exclude: false', 'includeWorkspaceDeps: true', 'references:', '  add: []', '  skip: []'].join('\n'),
      'utf-8'
    );

    const cfg = await readTsconfigConfig(tsconfigPath);
    expect(cfg.exclude).toBe(false);
    expect(cfg.includeWorkspaceDeps).toBe(true);
    expect(cfg.references.add).toEqual([]);
    expect(cfg.references.skip).toEqual([]);
  });
});
