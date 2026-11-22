import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import { mapCachedPosts, restorePosts, snapshotPosts } from '../api/postCache';
import { useToast } from '../context/ToastContext';
import { useRequireAuth } from './useRequireAuth';

// Optimistic voting: the UI changes instantly, rolls back if the server refuses,
// and finally takes the server's score as the truth.
export const useVote = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();

  const mutation = useMutation({
    mutationFn: async ({ postId, value }) => (await api.put(`/posts/${postId}/vote`, { value })).data,

    onMutate: async ({ postId, value }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: ['post'] });
      const snapshot = snapshotPosts(queryClient);
      // Same delta rule as the server: newValue - oldValue.
      mapCachedPosts(queryClient, (post) =>
        post.id === postId ? { ...post, score: post.score + value - post.userVote, userVote: value } : post,
      );
      return { snapshot };
    },

    onError: (err, _vars, context) => {
      restorePosts(queryClient, context.snapshot);
      toast(getErrorMessage(err), 'error');
    },

    onSuccess: (result, { postId }) => {
      mapCachedPosts(queryClient, (post) => (post.id === postId ? { ...post, ...result } : post));
    },
  });

  return (postId, value) => {
    if (requireAuth()) mutation.mutate({ postId, value });
  };
};