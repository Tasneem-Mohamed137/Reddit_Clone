import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// `path` is any cursor-paginated posts endpoint (/posts, /feed, /communities/:name/posts, ...).
// `params` adds endpoint-specific query parameters (for example { q, type: 'posts' } for search).
export const useInfinitePosts = (path, { sort, range, params = {} }) => {
  const { user } = useAuth();
  return useInfiniteQuery({
    // The user id is part of the key: votes and "joined" flags differ per user.
    queryKey: ['posts', path, sort, range, params, user?.id ?? 'anon'],
    initialPageParam: null,
    queryFn: async ({ pageParam }) =>
      (
        await api.get(path, {
          params: { sort, range: sort === 'top' ? range : undefined, cursor: pageParam ?? undefined, limit: 10, ...params },
        })
      ).data,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};