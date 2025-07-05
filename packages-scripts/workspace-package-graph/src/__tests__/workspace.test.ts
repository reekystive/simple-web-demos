import { resolveWorkspaceProjectPaths } from '#src/project-paths.js';
import { describe, expect, it } from 'vitest';

const expectedProjectPaths = [
  'apps-web/app-storybook',
  'apps-web/app-template-vite',
  'packages/tsconfig',
  'packages/utils',
];

describe('resolveWorkspaceProjectPaths', () => {
  it('should return at least one project path', async () => {
    const projectPaths = await resolveWorkspaceProjectPaths();
    expect(projectPaths).toBeDefined();
    expect(projectPaths.length).toBeGreaterThan(0);
  });

  it('should end with a slash', async () => {
    const projectPaths = await resolveWorkspaceProjectPaths();
    expect(projectPaths.map((p) => p.href)).toContainEqual(expect.stringMatching(/\/$/));
  });

  it('should not contain duplicate project paths', async () => {
    const projectPaths = await resolveWorkspaceProjectPaths();
    const uniqueProjectPaths = new Set(projectPaths.map((p) => p.href));
    expect(uniqueProjectPaths.size).toBe(projectPaths.length);
  });

  it.each(expectedProjectPaths)('should contain %s', async (path) => {
    const projectPaths = await resolveWorkspaceProjectPaths();
    const hrefArray = projectPaths.map((p) => p.href);
    expect(hrefArray).toContainEqual(expect.stringMatching(new RegExp(`^file://.*/${path}/$`)));
  });
});
