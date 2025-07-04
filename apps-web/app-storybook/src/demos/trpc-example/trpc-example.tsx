import { cn } from '@monorepo/utils';
import {
  DefaultError,
  MutationState,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ButtonHTMLAttributes, FC, useCallback, useState } from 'react';
import { trpc } from './trpc-client.js';

const Button: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => {
  return (
    <button
      className={cn(
        'cursor-pointer rounded-sm bg-amber-400 px-2 py-1 text-xs text-white transition-all disabled:opacity-60 dark:bg-amber-800',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const TRPCExample: FC = () => {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => trpc.userList.query(),
  });

  const addUserMutation = useMutation({
    mutationKey: ['userCreate'],
    mutationFn: (name: string) => trpc.userCreate.mutate({ name }),
    onMutate: () => {
      void queryClient.cancelQueries({ queryKey: ['users'] });
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const addUserMutationState = useMutationState<MutationState<unknown, DefaultError, string>>({
    filters: { mutationKey: ['userCreate'] },
  });

  const deleteAllUsersMutation = useMutation({
    mutationFn: () => trpc.userDeleteAll.mutate(),
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationKey: ['userDelete'],
    mutationFn: (id: string) => trpc.userDelete.mutate({ id }),
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteUserMutationState = useMutationState<MutationState<unknown, DefaultError, string>>({
    filters: { mutationKey: ['userDelete'] },
  });

  const handleRefetchUsers = useCallback(() => {
    void userQuery.refetch();
  }, [userQuery]);

  const handleAddUser = useCallback(() => {
    if (name.trim()) {
      addUserMutation.mutate(name.trim());
      setName('');
    }
  }, [addUserMutation, name]);

  const handleDeleteUser = useCallback(
    (id: string) => {
      deleteUserMutation.mutate(id);
    },
    [deleteUserMutation]
  );

  const handleDeleteAllUsers = useCallback(() => {
    deleteAllUsersMutation.mutate();
  }, [deleteAllUsersMutation]);

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <div className="text-xs">
        <span>Query state: </span>
        <span className="font-bold">
          {userQuery.isLoading && 'Loading...'}
          {userQuery.isRefetching && 'Refetching...'}
          {userQuery.error && 'Error'}
          {!userQuery.isLoading && !userQuery.isRefetching && !userQuery.error && 'Success'}
        </span>
      </div>

      <div className="text-xs">
        <span>Add user mutation state: </span>
        <span className="font-bold">
          {addUserMutation.isPending && 'Adding user...'}
          {addUserMutation.isSuccess && 'Added user'}
          {addUserMutation.isError && 'Failed to add user'}
          {!addUserMutation.isPending &&
            !addUserMutation.isSuccess &&
            !addUserMutation.isError &&
            'No mutation in progress'}
        </span>
      </div>

      <div className="text-xs">
        <span>Delete user mutation state: </span>
        <span className="font-bold">
          {deleteUserMutation.isPending && 'Deleting user...'}
          {deleteUserMutation.isSuccess && 'Deleted user'}
          {deleteUserMutation.isError && 'Failed to delete user'}
          {!deleteUserMutation.isPending &&
            !deleteUserMutation.isSuccess &&
            !deleteUserMutation.isError &&
            'No mutation in progress'}
        </span>
      </div>

      <div className="text-xs">
        <span>Delete all users mutation state: </span>
        <span className="font-bold">
          {deleteAllUsersMutation.isPending && 'Deleting all users...'}
          {deleteAllUsersMutation.isSuccess && 'Deleted all users'}
          {deleteAllUsersMutation.isError && 'Failed to delete all users'}
          {!deleteAllUsersMutation.isPending &&
            !deleteAllUsersMutation.isSuccess &&
            !deleteAllUsersMutation.isError &&
            'No mutation in progress'}
        </span>
      </div>

      <div className="flow-row flex flex-wrap gap-2">
        <Button onClick={handleRefetchUsers} disabled={userQuery.isFetching}>
          Refetch
        </Button>
        <Button onClick={handleDeleteAllUsers} disabled={deleteAllUsersMutation.isPending}>
          Delete All Users
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleAddUser();
        }}
      >
        <input
          type="text"
          autoComplete="off"
          className="w-40 rounded-sm border border-gray-500/50 px-2 py-1 text-sm outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Magic happens"
        />
        <Button type="submit" disabled={!name.trim()}>
          Add User
        </Button>
      </form>

      <div className="flex min-w-[10rem] flex-col gap-1">
        {userQuery.isLoading && <div className="text-center text-xs">⚙️ Loading...</div>}
        {(userQuery.data ?? []).map((user) => (
          <UserItem
            key={user.id}
            name={user.name}
            onDeleteClick={() => handleDeleteUser(user.id)}
            pending={
              deleteAllUsersMutation.isPending ||
              deleteUserMutationState.some(
                (mutation) => mutation.variables === user.id && mutation.status === 'pending'
              )
            }
          />
        ))}
        {addUserMutationState.map((mutation, index) => {
          if (mutation.status !== 'pending' || !mutation.variables) return null;
          return <UserItem key={index} name={mutation.variables} pending />;
        })}
      </div>
    </div>
  );
};

const UserItem: FC<{ name: string; onDeleteClick?: () => void; pending: boolean }> = ({
  name,
  onDeleteClick,
  pending,
}) => {
  return (
    <div
      className={cn(
        'flex flex-row items-center justify-between rounded-sm border border-gray-500/50 text-sm',
        pending && 'opacity-50'
      )}
    >
      <div className="py-1 pl-2">{name}</div>
      <button className="mr-1 cursor-pointer p-1" onClick={onDeleteClick} disabled={pending}>
        🗑️
      </button>
    </div>
  );
};
