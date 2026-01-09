import { createCacheKey } from '#src/lib/cache-key';
import type { SpeedtestServer } from '#src/lib/schemas';
import { speedtestServersRawSchema, transformServer } from '#src/lib/schemas';
import { NextResponse } from 'next/server';
import { ofetch } from 'ofetch';

const SPEEDTEST_API_URL = 'https://www.speedtest.net/api/js/servers';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface CacheEntry {
  data: SpeedtestServer[];
  timestamp: number;
}

// Cache with TTL
const cache = new Map<string, CacheEntry>();

// Pending requests - avoid duplicate requests
const pendingRequests = new Map<string, Promise<SpeedtestServer[]>>();

// Last cleanup timestamp
let lastCleanupTime = Date.now();

function getCached(key: string): SpeedtestServer[] | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: SpeedtestServer[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function cleanupExpiredCacheIfNeeded(): void {
  const now = Date.now();

  // Only cleanup once per day
  if (now - lastCleanupTime < CACHE_TTL_MS) {
    return;
  }

  lastCleanupTime = now;

  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

async function fetchFromUpstream(queryParams: Record<string, string>): Promise<SpeedtestServer[]> {
  const data: unknown = await ofetch(SPEEDTEST_API_URL, { query: queryParams });

  const parsed = speedtestServersRawSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Invalid response format');
  }

  return parsed.data.map(transformServer);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';

  if (!search.trim()) {
    return NextResponse.json([]);
  }

  const queryParams = {
    engine: 'js',
    https_functional: 'true',
    limit: '100',
    search: search.toLowerCase(),
  };

  const cacheKey = createCacheKey(queryParams);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Check if request is already pending
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    try {
      const servers = await pending;
      return NextResponse.json(servers);
    } catch {
      return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
    }
  }

  // Create new request
  const fetchPromise = fetchFromUpstream(queryParams);
  pendingRequests.set(cacheKey, fetchPromise);

  try {
    const servers = await fetchPromise;
    setCache(cacheKey, servers);
    return NextResponse.json(servers);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch servers' }, { status: 500 });
  } finally {
    pendingRequests.delete(cacheKey);
    cleanupExpiredCacheIfNeeded();
  }
}
