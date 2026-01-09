import type { SpeedtestServer } from '#src/lib/schemas';
import { throttle } from 'es-toolkit';
import { ofetch } from 'ofetch';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

async function fetchServers(search: string): Promise<SpeedtestServer[]> {
  return ofetch<SpeedtestServer[]>('/api/servers', { query: { search } });
}

const MAX_HISTORY_SIZE = 100;
const MAX_CACHE_SIZE = 1000;
const MIN_QUERY_LENGTH = 2;
const THROTTLE_INTERVAL_MS = 200;
const ENABLE_REVALIDATE = false as boolean;

interface PendingRequest {
  sentAt: number;
  promise: Promise<SpeedtestServer[]>;
}

interface CacheEntry {
  data: SpeedtestServer[];
  arrivedAt: number;
  sentAt: number;
}

export interface UseServerSearchResult {
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayData: SpeedtestServer[];
  displayQuery: string;
  currentQuery: string;
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useServerSearch(): UseServerSearchResult {
  const [inputValue, setInputValue] = useState('');

  // Query history - tracks every input change, starts with empty string
  const [queryHistory, setQueryHistory] = useState<string[]>(['']);

  // Cache - maps query to results with timing info
  const [cache, setCache] = useState<Map<string, CacheEntry>>(() => new Map());

  // Error state
  const [error, setError] = useState<Error | null>(null);

  // Pending requests - track sentAt and promise for each query
  const pendingRequestsRef = useRef(new Map<string, PendingRequest>());

  // Force re-render when pending requests change
  const [, forceUpdate] = useState({});

  // Current query is the last item in history
  const currentQuery = queryHistory.at(-1) ?? '';

  // Check if a query is currently being fetched
  const isQueryPending = useCallback((query: string) => pendingRequestsRef.current.has(query), []);

  // Find the best data to display: longest prefix match from cache
  const displayState = useMemo(() => {
    const cacheKeys = [...cache.keys()];

    if (currentQuery.length < MIN_QUERY_LENGTH) {
      console.log('[displayState] query too short (%o) | isStale: false\ncache keys: %o', currentQuery, cacheKeys);
      return { data: [] as SpeedtestServer[], query: '', isPartialMatch: false, isRevalidating: false, isStale: false };
    }

    // Find the longest cached prefix of current query
    let bestMatch: { query: string; entry: CacheEntry } | null = null;

    for (const [query, entry] of cache) {
      if (currentQuery.startsWith(query) && (!bestMatch || query.length > bestMatch.query.length)) {
        bestMatch = { query, entry };
      }
    }

    if (bestMatch) {
      const isPartialMatch = bestMatch.query !== currentQuery;

      // Check if we're revalidating: there's a pending request for currentQuery
      // For exact match: pending request must have newer sentAt than cached data
      // For partial match: any pending request for currentQuery means we're waiting for fresh data
      // If ENABLE_REVALIDATE is false, exact match is always considered fresh
      let isRevalidating = false;
      if (ENABLE_REVALIDATE) {
        const pendingRequest = pendingRequestsRef.current.get(currentQuery);
        if (pendingRequest) {
          if (isPartialMatch) {
            // Partial match + pending request = always revalidating
            isRevalidating = true;
          } else {
            // Exact match + pending request = revalidating only if pending sentAt is newer
            isRevalidating = bestMatch.entry.sentAt < pendingRequest.sentAt;
          }
        }
      }

      const isStale = isPartialMatch || (ENABLE_REVALIDATE && isRevalidating);

      console.log(
        '[displayState] currentQuery: %o | matched: %o | isPartialMatch: %o | isRevalidating: %o | isStale: %o\ncache keys: %o',
        currentQuery,
        bestMatch.query,
        isPartialMatch,
        isRevalidating,
        isStale,
        cacheKeys
      );
      return { data: bestMatch.entry.data, query: bestMatch.query, isPartialMatch, isRevalidating, isStale };
    }

    console.log('[displayState] currentQuery: %o | no match | isStale: false\ncache keys: %o', currentQuery, cacheKeys);
    return { data: [] as SpeedtestServer[], query: '', isPartialMatch: false, isRevalidating: false, isStale: false };
  }, [cache, currentQuery]);

  const { data: displayData, query: displayQuery, isStale } = displayState;

  // Fetch handler ref for throttle
  const fetchHandlerRef = useRef<((query: string) => void) | null>(null);

  // Throttled fetch trigger - initialized in effect to avoid ref access during render
  const throttledFetchRef = useRef<((query: string) => void) | null>(null);

  useEffect(() => {
    throttledFetchRef.current ??= throttle(
      (query: string) => {
        console.log('[throttle] triggered for query: %o', query);
        fetchHandlerRef.current?.(query);
      },
      THROTTLE_INTERVAL_MS,
      { edges: ['leading', 'trailing'] }
    );
  }, []);

  // Fetch data with request tracking
  const fetchData = useCallback((query: string) => {
    if (!query) return;

    const now = Date.now();
    const existingRequest = pendingRequestsRef.current.get(query);

    if (existingRequest) {
      // Already fetching this query, just update sentAt
      console.log('[fetchData] updating sentAt for pending request: %o', query);
      existingRequest.sentAt = now;
      forceUpdate({});
      return;
    }

    // Create new request
    const sentAt = now;
    console.log('[fetchData] starting new request: %o at %o', query, sentAt);

    const promise = fetchServers(query);

    pendingRequestsRef.current.set(query, { sentAt, promise });
    forceUpdate({});

    promise
      .then((result) => {
        const arrivedAt = Date.now();
        const request = pendingRequestsRef.current.get(query);
        const requestSentAt = request?.sentAt ?? sentAt;

        console.log('[fetchData] request completed: %o | sentAt: %o | arrivedAt: %o', query, requestSentAt, arrivedAt);

        // Always write to cache (keep max 1000 entries, remove oldest first)
        setCache((prev) => {
          const next = new Map(prev);
          next.set(query, { data: result, arrivedAt, sentAt: requestSentAt });
          if (next.size > MAX_CACHE_SIZE) {
            // Map maintains insertion order, delete the first (oldest) entry
            const firstKey = next.keys().next().value;
            if (firstKey !== undefined) {
              next.delete(firstKey);
            }
          }
          return next;
        });
      })
      .catch((err: unknown) => {
        console.log('[fetchData] request failed: %o | error: %o', query, err);
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      })
      .finally(() => {
        pendingRequestsRef.current.delete(query);
        forceUpdate({});
      });
  }, []);

  // Handle throttled search - decides whether to fetch
  const handleThrottledSearch = useCallback(
    (query: string) => {
      if (query.length < MIN_QUERY_LENGTH) return;

      // Skip fetch if cache hit and revalidate is disabled
      if (!ENABLE_REVALIDATE && cache.has(query)) {
        console.log('[handleThrottledSearch] cache hit, skip fetch (revalidate disabled): %o', query);
        return;
      }

      // Fetch (either new request or update existing pending request's sentAt)
      fetchData(query);
    },
    [cache, fetchData]
  );

  // Keep fetch handler ref updated
  useEffect(() => {
    fetchHandlerRef.current = handleThrottledSearch;
  }, [handleThrottledSearch]);

  // Handle input change - source of state changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const query = value.trim();

    // Update query history (keep max 100 entries)
    setQueryHistory((prev) => {
      // If same as last, don't add
      if (prev.at(-1) === query) return prev;
      const next = [...prev, query];
      return next.length > MAX_HISTORY_SIZE ? next.slice(-MAX_HISTORY_SIZE) : next;
    });

    // Clear error when input changes
    setError(null);

    // Trigger throttled fetch (only if query is long enough)
    if (query.length >= MIN_QUERY_LENGTH) {
      throttledFetchRef.current?.(query);
    }
  }, []);

  const isLoading =
    currentQuery.length >= MIN_QUERY_LENGTH &&
    !cache.has(currentQuery) &&
    displayData.length === 0 &&
    !error &&
    isQueryPending(currentQuery);

  return {
    inputValue,
    handleInputChange,
    displayData,
    displayQuery,
    currentQuery,
    isStale,
    isLoading,
    error,
  };
}
