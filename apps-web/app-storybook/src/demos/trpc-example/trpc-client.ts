import type { AppRouter } from '@monorepo/app-trpc-server/shared-types';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);

// Pass AppRouter as generic here. This lets the `trpc` object know
// what procedures are available on the server and their input/output types.
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: new URL('/trpc', baseUrl),
      fetch: async (...props) => {
        if (import.meta.env.DEV) {
          // add a delay to the request to simulate a slow network
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        return fetch(...props);
      },
    }),
  ],
});
