import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Returns a function: true when logged in, otherwise opens the login modal and returns false.
export const useRequireAuth = () => {
  const { user, openAuth } = useAuth();
  return useCallback(() => {
    if (user) return true;
    openAuth('login');
    return false;
  }, [user, openAuth]);
};