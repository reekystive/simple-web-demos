import { readWantedLockfile } from '@pnpm/lockfile.fs';
import { workspaceRootPath } from './constants.js';

export const resolveWorkspaceProjectPaths = async () => {
  const lockfile = await readWantedLockfile(workspaceRootPath.pathname, { ignoreIncompatible: false });
  const projectPaths = Object.keys(lockfile?.importers ?? {})
    .filter((projectId) => projectId !== '.')
    .map((projectId) => new URL(projectId + '/', workspaceRootPath));
  return projectPaths;
};
