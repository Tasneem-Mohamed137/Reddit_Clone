import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import { mapCachedPosts } from '../api/postCache';
import { useToast } from '../context/ToastContext';

export const useMembership = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ name, join }) =>
      (join ? await api.post(`/communities/${name}/membership`) : await api.delete(`/communities/${name}/membership`)).data
        .community,
    onSuccess: (community, { join }) => {
      mapCachedPosts(queryClient, (post) =>
        post.community.id === community.id ? { ...post, isJoined: join } : post,
      );
      queryClient.invalidateQueries({ queryKey: ['community'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast(join ? `Joined r/${community.name}` : `Left r/${community.name}`);
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });
};