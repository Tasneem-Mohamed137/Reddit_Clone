import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cake, MessageCircle, Pencil } from 'lucide-react';
import { api } from '../api/client';
import FeedControls from '../components/feed/FeedControls';
import PostCard from '../components/feed/PostCard';
import PostList from '../components/feed/PostList';
import FollowButton from '../components/people/FollowButton';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useFeedControls } from '../hooks/useFeedControls';
import { useInfinitePosts } from '../hooks/useInfinitePosts';
import { formatCount, formatDate, postUrl, timeAgo } from '../utils/format';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'posts', label: 'Posts' },
  { id: 'comments', label: 'Comments' },
];

function useUserComments(username) {
  return useQuery({
    queryKey: ['user-comments', username],
    queryFn: async () => (await api.get(`/users/${username}/comments`)).data.items,
  });
}

function CommentRows({ username, items }) {
  if (items.length === 0) return <p className="py-10 text-center text-muted">No comments yet.</p>;
  return items.map((c) => (
    <Link key={c.id} to={postUrl(c.post.communityName, c.post.id, c.post.title)} className="block rounded-2xl p-3 hover:bg-hover">
      <div className="text-xs text-muted">
        <span className="font-medium text-ink">u/{username}</span> commented on {c.post.title} • r/{c.post.communityName} • {timeAgo(c.createdAt)}
      </div>
      <p className="rtl-aware mt-1 line-clamp-3 text-sm">{c.body}</p>
    </Link>
  ));
}

function Overview({ username, onSeeAll }) {
  const posts = useInfinitePosts(`/users/${username}/posts`, { sort: 'new', range: 'all' });
  const comments = useUserComments(username);
  const latestPosts = posts.data?.pages[0]?.items.slice(0, 5) ?? [];
  const latestComments = comments.data?.slice(0, 5) ?? [];

  return (
    <div>
      <h2 className="px-3 pt-2 text-xs font-medium uppercase tracking-wider text-muted">Latest posts</h2>
      {posts.isLoading && <div className="skeleton m-3 h-24" />}
      {!posts.isLoading && latestPosts.length === 0 && <p className="py-6 text-center text-muted">No posts yet.</p>}
      {latestPosts.map((post) => <PostCard key={post.id} post={post} />)}
      {latestPosts.length > 0 && <button onClick={() => onSeeAll('posts')} className="px-3 py-2 text-sm font-medium text-link hover:underline">See all posts</button>}

      <h2 className="px-3 pt-4 text-xs font-medium uppercase tracking-wider text-muted">Latest comments</h2>
      {comments.isLoading && <div className="skeleton m-3 h-16" />}
      {comments.data && <CommentRows username={username} items={latestComments} />}
      {(comments.data?.length ?? 0) > 5 && <button onClick={() => onSeeAll('comments')} className="px-3 py-2 text-sm font-medium text-link hover:underline">See all comments</button>}
    </div>
  );
}

function PostsTab({ username }) {
  const controls = useFeedControls('new');
  return (
    <>
      <FeedControls controls={controls} />
      <PostList path={`/users/${username}/posts`} controls={controls} empty="No posts yet." />
    </>
  );
}

function CommentsTab({ username }) {
  const comments = useUserComments(username);
  if (comments.isLoading) return <div className="skeleton h-24" />;
  return <CommentRows username={username} items={comments.data ?? []} />;
}

function SavedTab() {
  const controls = useFeedControls('new');
  return (
    <>
      <FeedControls controls={controls} />
      <PostList path="/users/me/saved" controls={controls} empty="You have not saved any posts yet." />
    </>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const { messageUser } = useChat();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const selectTab = (id) => setParams(id === 'overview' ? {} : { tab: id });

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', username, user?.id ?? 'anon'],
    queryFn: async () => (await api.get(`/users/${username}`)).data.user,
    retry: false,
  });

  if (isLoading) return <div className="skeleton h-40" />;
  if (isError) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold">User not found</h1>
        <p className="mt-1 text-muted">u/{username} does not exist.</p>
      </div>
    );
  }

  const isMe = user?.username === profile.username;

  return (
    <>
      <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-line">
        <Avatar name={profile.username} src={profile.avatarUrl} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="rtl-aware text-2xl font-bold">{profile.displayName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted">
            u/{profile.username}
            {profile.followsYou && <span className="rounded-full bg-input px-2 py-0.5 text-[10px] font-medium">Follows you</span>}
          </div>
          {profile.bio && <p className="rtl-aware mt-2 text-sm">{profile.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span><b className="text-sm text-ink">{formatCount(profile.karma)}</b> karma</span>
            <span><b className="text-sm text-ink">{formatCount(profile.followerCount)}</b> followers</span>
            <span><b className="text-sm text-ink">{formatCount(profile.followingCount)}</b> following</span>
            <span className="flex items-center gap-1.5"><Cake size={14} /> Cake day: {formatDate(profile.cakeDay)}</span>
          </div>
        </div>

        {isMe ? (
          <Link to="/settings/profile" className="flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-hover">
            <Pencil size={16} /> Edit profile
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <FollowButton username={profile.username} className="!h-9 !px-5 !text-sm" />
            <button onClick={() => messageUser(profile.username)} className="flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-hover">
              <MessageCircle size={16} /> Message
            </button>
          </div>
        )}
      </section>

      <div className="my-3 flex gap-1">
        {[...TABS, ...(isMe ? [{ id: 'saved', label: 'Saved' }] : [])].map((t) => (
          <button key={t.id} onClick={() => selectTab(t.id)} className={`h-9 rounded-full px-4 text-sm font-medium ${tab === t.id ? 'bg-hover' : 'text-muted hover:bg-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview username={profile.username} onSeeAll={selectTab} />}
      {tab === 'posts' && <PostsTab username={profile.username} />}
      {tab === 'comments' && <CommentsTab username={profile.username} />}
      {tab === 'saved' && isMe && <SavedTab />}
    </>
  );
}