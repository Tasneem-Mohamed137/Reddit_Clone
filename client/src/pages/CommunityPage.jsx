import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Cake, Plus } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import FeedControls from '../components/feed/FeedControls';
import PostList from '../components/feed/PostList';
import { useAuth } from '../context/AuthContext';
import { useCommunity } from '../hooks/useCommunity';
import { useFeedControls } from '../hooks/useFeedControls';
import { useMembership } from '../hooks/useMembership';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { addRecentCommunity } from '../hooks/useRecentCommunities';
import { formatCount, formatDate } from '../utils/format';

function AboutCard({ community }) {
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">About community</h2>
      <p className="rtl-aware text-sm">{community.description || 'No description yet.'}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Cake size={16} /> Created {formatDate(community.createdAt)}
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <div className="text-base font-semibold">{formatCount(community.memberCount)}</div>
        <div className="text-xs text-muted">Members</div>
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Moderators</h3>
        {community.moderators.map((m) => (
          <Link key={m.id} to={`/user/${m.username}`} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-hover">
            <Avatar name={m.username} src={m.avatarUrl} size={24} /> u/{m.username}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function CommunityPage() {
  const { name } = useParams();
  const { railEl } = useOutletContext();
  const { guardLink } = useAuth();
  const requireAuth = useRequireAuth();
  const controls = useFeedControls();
  const membership = useMembership();
  const { data: community, isLoading, isError } = useCommunity(name);

  useEffect(() => {
    if (community) addRecentCommunity({ name: community.name, iconUrl: community.iconUrl });
  }, [community?.name, community?.iconUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div className="skeleton h-48" />;
  if (isError) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Community not found</h1>
        <p className="mt-1 text-muted">r/{name} does not exist.</p>
        <Link to="/communities/create" onClick={guardLink} className="mt-4 inline-block rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Create it
        </Link>
      </div>
    );
  }

  const toggleMembership = () => {
    if (requireAuth()) membership.mutate({ name: community.name, join: !community.isMember });
  };

  return (
    <>
      <div
        className="h-24 rounded-2xl bg-gradient-to-r from-btn to-link sm:h-32"
        style={community.bannerUrl ? { backgroundImage: `url(${community.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="flex flex-wrap items-end gap-3 px-2 pb-3">
        <div className="-mt-6 rounded-full ring-4 ring-app">
          <Avatar name={community.name} src={community.iconUrl} size={72} />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-2xl font-bold">r/{community.name}</h1>
          {community.isModerator && <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Mod</span>}
        </div>
        <Link to={`/submit?community=${community.name}`} onClick={guardLink} className="flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-hover">
          <Plus size={18} /> Create Post
        </Link>
        <button
          onClick={toggleMembership}
          disabled={membership.isPending || community.isModerator}
          title={community.isModerator ? 'Moderators cannot leave their community' : undefined}
          className={`group h-9 rounded-full px-5 text-sm font-semibold disabled:opacity-60 ${
            community.isMember ? 'border border-line hover:bg-hover' : 'bg-btn text-white hover:opacity-90'
          }`}
        >
          {community.isMember ? (
            <>
              <span className="group-hover:hidden">Joined</span>
              <span className="hidden group-hover:inline">Leave</span>
            </>
          ) : (
            'Join'
          )}
        </button>
      </div>
      
      <div className="mb-3 lg:hidden">
        <AboutCard community={community} />
      </div>

      <FeedControls controls={controls} />
      <PostList
        key={community.name}
        path={`/communities/${community.name}/posts`}
        controls={controls}
        canModerate={community.isModerator}
        showJoin={false}
        empty="This community has no posts yet."
      />

      {railEl && createPortal(<AboutCard community={community} />, railEl)}
    </>
  );
}