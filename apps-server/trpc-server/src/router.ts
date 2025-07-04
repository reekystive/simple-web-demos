import { z } from 'zod';
import { db } from './database.js';
import { publicProcedure, router } from './trpc.js';

export const appRouter = router({
  userList: publicProcedure.query(async () => {
    const users = await db.user.findMany();
    return users;
  }),

  userById: publicProcedure.input(z.string()).query(async (opts) => {
    const { input } = opts;
    const user = await db.user.findById(input);
    return user;
  }),

  userCreate: publicProcedure.input(z.object({ name: z.string() })).mutation(async (opts) => {
    const { input } = opts;
    const user = await db.user.create(input);
    return user;
  }),

  userDelete: publicProcedure.input(z.object({ id: z.string() })).mutation(async (opts) => {
    const { input } = opts;
    await db.user.delete(input.id);
  }),

  userDeleteAll: publicProcedure.mutation(async () => {
    await db.user.deleteMany();
  }),
});

export type AppRouter = typeof appRouter;
