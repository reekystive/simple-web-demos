import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router.js';

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000).on('listening', () => {
  console.log('Server is running on http://localhost:3000');
});
