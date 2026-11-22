import { useAuth } from '../../context/AuthContext';
import { useFollow, useFollowing } from '../../hooks/useSocial';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function FollowButton({ username, className = '' }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { usernames, isLoading } = useFollowing();
  const follow = useFollow();

  if (user?.username === username) return null;

  const following = usernames.has(username.toLowerCase());
  const toggle = () => {
    if (requireAuth()) follow.mutate({ username, follow: !following });
  };

  return (
    <button
      onClick={toggle}
      disabled={follow.isPending || (Boolean(user) && isLoading)}
      className={`group h-8 rounded-full px-4 text-xs font-semibold disabled:opacity-60 ${
        following ? 'border border-line hover:bg-hover' : 'bg-btn text-white hover:opacity-90'
      } ${className}`}
    >
      {following ? (
        <>
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        'Follow'
      )}
    </button>
  );
}