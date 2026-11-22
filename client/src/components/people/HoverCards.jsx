import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cake, MessageCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCommunity } from '../../hooks/useCommunity';
import { useMembership } from '../../hooks/useMembership';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatCount, formatDate } from '../../utils/format';
import Avatar from '../ui/Avatar';
import HoverPopover from '../ui/HoverPopover';
import FollowButton from './FollowButton';

function UserCard({ username }) {
  const { user } = useAuth();
  const { messageUser } = useChat();
  // Same key as the profile page, so a visited profile opens instantly from the cache.
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username, user?.id ?? 'anon'],
    queryFn: async () => (await api.get(`/users/${username}`)).data.user,
    retry: false,
  });

  if (isLoading) return <span className="skeleton block h-24" />;
  if (!profile) return <span className="text-sm text-muted">User not found</span>;

  return (
    <span className="block">
      <span className="flex items-center gap-3">
        <Avatar name={profile.username} src={profile.avatarUrl} size={48} />
        <Link to={`/user/${profile.username}`} className="min-w-0">
          <span className="block truncate font-semibold hover:underline">u/{profile.username}</span>
          <span className="rtl-aware block truncate text-xs text-muted">{profile.displayName}</span>
        </Link>
      </span>
      {profile.bio && <span className="rtl-aware mt-3 line-clamp-2 block text-sm">{profile.bio}</span>}
      <span className="mt-3 flex gap-5 text-xs text-muted">
        <span><b className="text-sm text-ink">{formatCount(profile.karma)}</b> karma</span>
        <span><b className="text-sm text-ink">{formatCount(profile.followerCount)}</b> followers</span>
      </span>
      <span className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Cake size={14} /> Cake day: {formatDate(profile.cakeDay)}</span>
      {user?.username !== profile.username && (
        <span className="mt-3 flex items-center gap-2">
          <FollowButton username={profile.username} />
          <button onClick={() => messageUser(profile.username)} className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold hover:bg-hover">
            <MessageCircle size={14} /> Message
          </button>
        </span>
      )}
    </span>
  );
}

function CommunityCard({ name }) {
  const { data: community, isLoading } = useCommunity(name);
  const membership = useMembership();
  const requireAuth = useRequireAuth();

  if (isLoading) return <span className="skeleton block h-24" />;
  if (!community) return <span className="text-sm text-muted">Community not found</span>;

  const toggle = () => {
    if (requireAuth()) membership.mutate({ name: community.name, join: !community.isMember });
  };

  return (
    <span className="block">
      <span className="flex items-center gap-3">
        <Avatar name={community.name} src={community.iconUrl} size={48} />
        <Link to={`/r/${community.name}`} className="min-w-0">
          <span className="block truncate font-semibold hover:underline">r/{community.name}</span>
          <span className="block text-xs text-muted">{formatCount(community.memberCount)} members</span>
        </Link>
      </span>
      {community.description && <span className="rtl-aware mt-3 line-clamp-3 block text-sm">{community.description}</span>}
      <button
        onClick={toggle}
        disabled={membership.isPending || community.isModerator}
        className={`mt-3 h-8 rounded-full px-4 text-xs font-semibold disabled:opacity-60 ${community.isMember ? 'border border-line hover:bg-hover' : 'bg-btn text-white hover:opacity-90'}`}
      >
        {community.isMember ? 'Joined' : 'Join'}
      </button>
    </span>
  );
}

export const UserHover = ({ username, children }) => (
  <HoverPopover content={<UserCard username={username} />}>{children}</HoverPopover>
);

export const CommunityHover = ({ name, children }) => (
  <HoverPopover content={<CommunityCard name={name} />}>{children}</HoverPopover>
);