import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const useCommunity = (name) =>
  useQuery({
    queryKey: ['community', name],
    queryFn: async () => (await api.get(`/communities/${name}`)).data.community,
    enabled: Boolean(name),
    retry: false,
  });