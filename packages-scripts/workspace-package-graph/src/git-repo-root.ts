import fs from 'node:fs/promises';

const GIT_DIR_OR_FILE = '.git';

const existsFileOrDir = async (path: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory() || stat.isFile();
  } catch {
    return false;
  }
};

export const getGitRepoRoot = async (from?: URL): Promise<URL | null> => {
  const resolve = async (dir: URL): Promise<URL | null> => {
    const git = new URL(GIT_DIR_OR_FILE, dir);
    if (await existsFileOrDir(git.pathname)) {
      return dir;
    }
    const parent = new URL('../', dir);
    return parent.href === dir.href ? null : resolve(parent);
  };
  const fromUrl = from ?? new URL(import.meta.url);
  return await resolve(fromUrl);
};
