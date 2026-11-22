import { useAuth } from '../../context/AuthContext';

export default function RequireAuth({ children }) {
  const { user, isLoading, openAuth } = useAuth();
  if (isLoading) return <div className="skeleton h-40" />;
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card py-16 text-center ring-1 ring-line">
        <h1 className="text-lg font-semibold">Log in to continue</h1>
        <p className="text-muted">You need an account to do this.</p>
        <button onClick={() => openAuth('login')} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Log In
        </button>
      </div>
    );
  }
  return children;
}