'use client';

import { useServerSearch } from '#src/lib/use-server-search';
import { cn } from '@monorepo/utils';

const MIN_QUERY_LENGTH = 2;

export default function Home() {
  const { inputValue, handleInputChange, displayData, displayQuery, currentQuery, isStale, isLoading, error } =
    useServerSearch();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-stretch px-4 pt-12 pb-8">
      <h1 className="mb-2 px-3 text-lg font-medium">Search Ookla Speedtest Servers</h1>

      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search servers (e.g. China, Tokyo, US...)"
        className={`
          mb-4 w-full rounded-md border-none px-3 py-2 text-base outline-1 -outline-offset-1 outline-blue-200/40
          transition-colors duration-75 ease-in-out
          focus:outline-amber-500/80
          active:outline-amber-500/80
        `}
      />

      {isLoading && <p className="self-center px-3 py-6 text-center text-gray-500">Loading...</p>}

      {error && <p className="self-center px-3 py-6 text-center text-red-500/80">Error: {error.message}</p>}

      {displayData.length > 0 && (
        <ul
          className={cn('space-y-4 opacity-100', isStale && 'opacity-60 transition-opacity duration-150 ease-in-out')}
        >
          {displayData.map((server) => (
            <li
              key={server.id}
              className="rounded-md bg-neutral-500/10 px-3 py-3 outline-1 -outline-offset-1 outline-blue-200/40"
            >
              <div className="-mt-1 font-medium">
                {server.name}, {server.country} ({server.countryCode})
              </div>
              <div className="mt-1 font-mono text-xs">
                <span>{`#${server.id}`}</span> <span className="opacity-80">{server.host}</span>
              </div>
              <div className="mt-1 text-xs opacity-80">{server.sponsor}</div>
              <div className="mt-1 text-xs opacity-80">
                ({server.lat}, {server.lon})
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
