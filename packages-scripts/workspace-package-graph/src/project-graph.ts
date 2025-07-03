import { BaseManifest, type ProjectRootDir } from '@pnpm/types';
import { createPkgGraph, Package } from '@pnpm/workspace.pkgs-graph';
import { readFile } from 'fs/promises';
import { workspaceRootPath } from './constants.js';
import { resolveWorkspaceProjectPaths } from './project-paths.js';

const createProjectRootDir = (value: string): ProjectRootDir => value as ProjectRootDir;

const getPackageManifest = async (p: URL): Promise<BaseManifest> => {
  const manifest = JSON.parse(await readFile(new URL('package.json', p), 'utf8')) as BaseManifest;
  return manifest;
};

export const resolveWorkspacePackagesGraph = async () => {
  const projectPaths = [workspaceRootPath, ...(await resolveWorkspaceProjectPaths())];
  const pkgs: Package[] = await Promise.all(
    projectPaths.map(async (p) => ({
      manifest: await getPackageManifest(p),
      rootDir: createProjectRootDir(p.pathname),
    }))
  );
  return createPkgGraph(pkgs);
};
