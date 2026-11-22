import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// kind = 'following' | 'followers'
export const useConnections = (kind) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['connections', kind],
    queryFn: async () => (await api.get(`/users/me/${kind}`)).data.items,
    enabled: Boolean(user),
  });
};

// One list is the single source of truth for every Follow button on the page.
export const useFollowing = () => {
  const query = useConnections('following');
  const usernames = useMemo(() => new Set((query.data ?? []).map((u) => u.username.toLowerCase())), [query.data]);
  return { usernames, isLoading: query.isLoading };
};

export const useSuggestions = (limit = 8) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['suggestions', limit],
    queryFn: async () => (await api.get('/users/me/suggestions', { params: { limit } })).data.items,
    enabled: Boolean(user),
  });
};

export const useFollow = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ username, follow }) =>
      (follow ? await api.post(`/users/${username}/follow`) : await api.delete(`/users/${username}/follow`)).data,
    onSuccess: (_data, { username, follow }) => {
      for (const key of ['connections', 'suggestions', 'profile']) queryClient.invalidateQueries({ queryKey: [key] });
      // The "Following" feed now contains (or no longer contains) this person's posts.
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'posts' && q.queryKey[1] === '/feed' });
      toast(follow ? `You are now following u/${username}` : `Unfollowed u/${username}`);
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });
};