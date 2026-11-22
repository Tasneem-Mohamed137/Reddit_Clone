import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import { mapCachedPosts } from '../api/postCache';
import { useToast } from '../context/ToastContext';

// Save / hide / report / pin. Each one patches the cached posts, so menus update everywhere at once.
export const usePostActions = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onError = (err) => toast(getErrorMessage(err), 'error');
  const refreshLists = () => queryClient.invalidateQueries({ queryKey: ['posts'] });

  const save = useMutation({
    mutationFn: ({ postId, saved }) => (saved ? api.put(`/posts/${postId}/save`) : api.delete(`/posts/${postId}/save`)),
    onSuccess: (_res, { postId, saved }) => {
      mapCachedPosts(queryClient, (post) => (post.id === postId ? { ...post, isSaved: saved } : post));
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'posts' && q.queryKey[1] === '/users/me/saved' });
      toast(saved ? 'Post saved' : 'Post unsaved');
    },
    onError,
  });

  const hide = useMutation({
    mutationFn: ({ postId, hidden }) => (hidden ? api.put(`/posts/${postId}/hide`) : api.delete(`/posts/${postId}/hide`)),
    onSuccess: (_res, { hidden }) => {
      refreshLists(); // hidden posts disappear from the listings
      toast(hidden ? 'Post hidden' : 'Post visible again');
    },
    onError,
  });

  const report = useMutation({
    mutationFn: ({ postId, reason }) => api.post(`/posts/${postId}/report`, { reason }),
    onSuccess: () => toast('Thanks for reporting. The moderators will take a look.'),
    onError,
  });

  const pin = useMutation({
    mutationFn: ({ postId, pinned }) => (pinned ? api.put(`/posts/${postId}/pin`) : api.delete(`/posts/${postId}/pin`)),
    onSuccess: (_res, { postId, pinned }) => {
      mapCachedPosts(queryClient, (post) => (post.id === postId ? { ...post, pinned } : post));
      refreshLists(); // the order of the community feed changes
      toast(pinned ? 'Post pinned' : 'Post unpinned');
    },
    onError,
  });

  return { save, hide, report, pin };
};