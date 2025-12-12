import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveExcludedDirs, resolveExcludedFiles } from '../filters.js';

describe('filters (unit)', () => {
  it('resolveExcludedDirs supports !glob un-exclude semantics', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stspr-filters-'));
    await fs.mkdir(path.join(root, 'packages', 'a'), { recursive: true });
    await fs.mkdir(path.join(root, 'packages', 'b'), { recursive: true });

    const excluded = await resolveExcludedDirs(root, ['packages/*', '!packages/b']);
    expect(excluded.has(path.join(root, 'packages', 'a'))).toBe(true);
    expect(excluded.has(path.join(root, 'packages', 'b'))).toBe(false);
  });

  it('resolveExcludedFiles supports !glob un-exclude semantics', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stspr-filters-'));
    await fs.mkdir(path.join(root, 'packages', 'app'), { recursive: true });
    const web = path.join(root, 'packages', 'app', 'tsconfig.web.json');
    const keep = path.join(root, 'packages', 'app', 'tsconfig.keep.json');
    await fs.writeFile(web, '{}', 'utf-8');
    await fs.writeFile(keep, '{}', 'utf-8');

    const excluded = await resolveExcludedFiles(root, ['**/tsconfig.*.json', '!**/tsconfig.keep.json']);
    expect(excluded.has(web)).toBe(true);
    expect(excluded.has(keep)).toBe(false);
  });
});
