import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { $ } from 'zx';

export const getGitRepoRoot = async (from?: URL): Promise<URL> => {
  const cwd = path.dirname(fileURLToPath(from ?? new URL(import.meta.url)));
  const { stdout } = await $({ cwd })`git rev-parse --show-toplevel`;
  return pathToFileURL(stdout.trim());
};

if (pathToFileURL(process.argv[1] ?? '').href === new URL(import.meta.url).href) {
  const root = await getGitRepoRoot();
  console.log(root.href);
}
