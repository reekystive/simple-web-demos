import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { workspaceRootPath } from '../constants.js';

describe('workspaceRootPath', () => {
  it('should be a valid file url', () => {
    expect(workspaceRootPath.href).toMatch(/^file:\/\/.*$/);
  });

  it('should end with a slash', () => {
    expect(workspaceRootPath.href).toMatch(/\/$/);
  });

  it('should contain a package.json file', async () => {
    const packageJson = new URL('package.json', workspaceRootPath);
    expect((await fs.stat(packageJson)).isFile()).toBe(true);
  });

  it('should contain a pnpm-workspace.yaml file', async () => {
    const pnpmWorkspaceYaml = new URL('pnpm-workspace.yaml', workspaceRootPath);
    expect((await fs.stat(pnpmWorkspaceYaml)).isFile()).toBe(true);
  });
});
