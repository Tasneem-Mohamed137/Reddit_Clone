import { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const AuthContext = createContext(null);

const fetchMe = async () => {
  try {
    return (await api.get('/auth/me')).data.user;
  } catch (err) {
    if (err.response?.status === 401) return null; // logged out is a normal state, not an error
    throw err;
  }
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState(null); // 'login' | 'register' | null

  const { data: user = null, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  // Personalised data (votes, joined communities) belongs to the previous user, so drop it all.
  const setSession = (nextUser) => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    queryClient.setQueryData(['me'], nextUser);
  };

  const login = async (body) => {
    const { data } = await api.post('/auth/login', body);
    setSession(data.user);
    setModalMode(null);
  };

  const register = async (body) => {
    const { data } = await api.post('/auth/register', body);
    setSession(data.user);
    setModalMode(null);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setSession(null);
  };

  // onClick helper for links that need an account: opens the login modal instead of navigating.
  const guardLink = (event) => {
    if (user) return;
    event.preventDefault();
    setModalMode('login');
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    guardLink,
    modalMode,
    openAuth: setModalMode,
    closeAuth: () => setModalMode(null),
    setUser: (nextUser) => queryClient.setQueryData(['me'], nextUser),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);