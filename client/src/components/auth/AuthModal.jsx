import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Snoo } from '../ui/Logo';

const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;
const inputClass = 'h-12 w-full rounded-full bg-input px-5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-link';

function UsernameStatus({ username }) {
  const debounced = useDebounce(username, 400);
  const valid = USERNAME_RE.test(debounced);
  const { data: available } = useQuery({
    queryKey: ['username-available', debounced],
    queryFn: async () => (await api.get('/auth/username-available', { params: { username: debounced } })).data.available,
    enabled: valid,
  });

  if (!username) return null;
  if (!USERNAME_RE.test(username)) return <p className="px-4 text-xs text-muted">3-20 characters: letters, numbers, _ or -</p>;
  if (debounced !== username || available === undefined) return <p className="px-4 text-xs text-muted">Checking...</p>;
  return available
    ? <p className="px-4 text-xs text-green-500">Nice! u/{username} is available</p>
    : <p className="px-4 text-xs text-danger">That username is already taken</p>;
}

export default function AuthModal() {
  const { modalMode, openAuth, closeAuth, login, register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ identifier: '', email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError('');
  }, [modalMode]);

  useEffect(() => {
    if (!modalMode) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeAuth();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalMode, closeAuth]);

  if (!modalMode) return null;
  const isLogin = modalMode === 'login';
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) await login({ identifier: form.identifier, password: form.password });
      else await register({ email: form.email, username: form.username, password: form.password });
      toast(isLogin ? 'Welcome back!' : 'Account created');
      setForm({ identifier: '', email: '', username: '', password: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onMouseDown={closeAuth}>
      <div className="relative w-full max-w-[400px] rounded-3xl bg-card p-8 ring-1 ring-line" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={closeAuth} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-input hover:bg-hover" aria-label="Close">
          <X size={18} />
        </button>

        <Snoo size={40} />
        <h1 className="mt-3 text-2xl font-semibold">{isLogin ? 'Log In' : 'Sign Up'}</h1>
        <p className="mb-5 mt-1 text-xs text-muted">
          By continuing, you agree to our User Agreement and acknowledge that you understand the Privacy Policy.
        </p>

        <form onSubmit={submit} className="space-y-3">
          {isLogin ? (
            <input className={inputClass} placeholder="Email or username" value={form.identifier} onChange={set('identifier')} autoFocus required />
          ) : (
            <>
              <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={set('email')} autoFocus required />
              <input className={inputClass} placeholder="Username" value={form.username} onChange={set('username')} required />
              <UsernameStatus username={form.username} />
            </>
          )}
          <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={set('password')} required />

          {error && <p className="px-4 text-sm text-danger">{error}</p>}

          <button disabled={submitting} className="h-12 w-full rounded-full bg-btn font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Please wait...' : isLogin ? 'Log In' : 'Continue'}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted">
          {isLogin ? 'New to Reddit? ' : 'Already a redditor? '}
          <button onClick={() => openAuth(isLogin ? 'register' : 'login')} className="font-medium text-link hover:underline">
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}