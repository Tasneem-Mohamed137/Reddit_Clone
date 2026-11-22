import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// `path` is any cursor-paginated posts endpoint (/posts, /feed, /communities/:name/posts, ...).
export const useInfinitePosts = (path, { sort, range }) => {
  const { user } = useAuth();
  return useInfiniteQuery({
    // The user id is part of the key: votes and "joined" flags differ per user.
    queryKey: ['posts', path, sort, range, user?.id ?? 'anon'],
    initialPageParam: null,
    queryFn: async ({ pageParam }) =>
      (
        await api.get(path, {
          params: { sort, range: sort === 'top' ? range : undefined, cursor: pageParam ?? undefined, limit: 10 },
        })
      ).data,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};