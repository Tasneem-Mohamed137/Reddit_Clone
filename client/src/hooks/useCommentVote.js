import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useRequireAuth } from './useRequireAuth';

// Optimistic comment voting (same idea as post voting): instant change, rollback on error,
// then the server's score is taken as the truth. Comment lists are flat arrays under ['comments', ...].
export const useCommentVote = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();

  const patch = (commentId, fn) =>
    queryClient.setQueriesData({ queryKey: ['comments'] }, (items) =>
      Array.isArray(items) ? items.map((c) => (c.id === commentId ? fn(c) : c)) : items,
    );

  const mutation = useMutation({
    mutationFn: async ({ commentId, value }) => (await api.put(`/comments/${commentId}/vote`, { value })).data,
    onMutate: async ({ commentId, value }) => {
      await queryClient.cancelQueries({ queryKey: ['comments'] });
      const snapshot = queryClient.getQueriesData({ queryKey: ['comments'] });
      patch(commentId, (c) => ({ ...c, score: c.score + value - c.userVote, userVote: value }));
      return { snapshot };
    },
    onError: (err, _vars, context) => {
      context.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast(getErrorMessage(err), 'error');
    },
    onSuccess: (result, { commentId }) => patch(commentId, (c) => ({ ...c, ...result })),
  });

  return (commentId, value) => {
    if (requireAuth()) mutation.mutate({ commentId, value });
  };
};