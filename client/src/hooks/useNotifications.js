import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// The bell badge only needs a number, so it has its own small query.
export const useUnreadNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await api.get('/notifications/unread-count')).data.count,
    enabled: Boolean(user),
  });
};

export const useNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => (await api.get('/notifications')).data, // { items, unreadCount }
    enabled: Boolean(user),
  });
};