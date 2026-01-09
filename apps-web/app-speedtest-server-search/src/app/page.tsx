'use client';

import { useServerSearch } from '#src/lib/use-server-search';

const MIN_QUERY_LENGTH = 2;

export default function Home() {
  const { inputValue, handleInputChange, displayData, displayQuery, currentQuery, isStale, isLoading, error } =
    useServerSearch();

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Speedtest Server Search</h1>

      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search servers (e.g. China, Japan, US...)"
        className="mb-4 w-full border px-3 py-2"
      />

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {error && <p className="text-red-500">Error: {error.message}</p>}

      {displayData.length > 0 && (
        <ul className={isStale ? 'space-y-2 opacity-60' : 'space-y-2'}>
          {displayData.map((server) => (
            <li key={server.id} className="border p-3">
              <div className="font-medium">
                {server.name}, {server.country} ({server.countryCode})
              </div>
              <div className="text-sm text-gray-600">{server.sponsor}</div>
              <div className="font-mono text-xs text-gray-500">{server.host}</div>
              <div className="text-xs text-gray-400">ID: {server.id}</div>
              <div className="text-xs text-gray-400">
                {server.lat}, {server.lon}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading &&
        currentQuery.length >= MIN_QUERY_LENGTH &&
        displayQuery === currentQuery &&
        displayData.length === 0 &&
        !error && <p className="text-gray-500">No servers found</p>}
    </div>
  );
}
