import { createHash } from 'node:crypto';

function sortObjectKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function createCacheKey(params: Record<string, unknown>): string {
  const sorted = sortObjectKeys(params);
  const json = JSON.stringify(sorted);
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
