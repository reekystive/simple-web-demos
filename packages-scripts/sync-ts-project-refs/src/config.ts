import path from 'node:path';

// Get monorepo root directory
const MONOREPO_ROOT = path.resolve(import.meta.dirname, '../../../');

export const CONFIG = {
  MONOREPO_ROOT,
};
