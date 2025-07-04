export interface User {
  id: string;
  name: string;
}

// in-memory database
const users: User[] = [];
export const db = {
  user: {
    findMany: async () => Promise.resolve(users),
    findById: async (id: string) => Promise.resolve(users.find((user) => user.id === id)),
    create: async (data: { name: string }) => {
      const user = { id: String(users.length + 1), ...data };
      users.push(user);
      return Promise.resolve(user);
    },
    delete: async (id: string) => {
      const retained = users.filter((user) => user.id !== id);
      users.splice(0);
      users.push(...retained);
      return Promise.resolve();
    },
    deleteMany: async () => {
      users.splice(0);
      return Promise.resolve();
    },
  },
};
