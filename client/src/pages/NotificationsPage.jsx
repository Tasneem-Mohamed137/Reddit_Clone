import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import RequireAuth from '../components/auth/RequireAuth';
import Avatar from '../components/ui/Avatar';
import { Snoo } from '../components/ui/Logo';
import { useNotifications } from '../hooks/useNotifications';
import { postUrl, timeAgo } from '../utils/format';

const TEXT = {
  post_comment: 'commented on your post',
  comment_reply: 'replied to your comment',
  follow: 'started following you',
};

const hrefOf = (n) => (n.post ? postUrl(n.post.communityName, n.post.id, n.post.title) : `/user/${n.actor.username}`);

function Row({ n }) {
  return (
    <Link to={hrefOf(n)} className={`flex items-start gap-3 rounded-2xl p-3 hover:bg-hover ${n.read ? '' : 'bg-hover/60'}`}>
      <Avatar name={n.actor.username} src={n.actor.avatarUrl} size={40} />
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">u/{n.actor.username}</span> {TEXT[n.type]}
        {n.post && <span className="rtl-aware text-muted"> “{n.post.title}”</span>}
        <div className="mt-0.5 text-xs text-muted">
          {timeAgo(n.createdAt)}
          {n.post && ` • r/${n.post.communityName}`}
        </div>
      </div>
      {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
    </Link>
  );
}

function EmptyState() {
  const popular = useQuery({
    queryKey: ['communities', 'popular-one'],
    queryFn: async () => (await api.get('/communities', { params: { limit: 1 } })).data.items[0] ?? null,
  });
  const community = popular.data;

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Snoo size={150} />
      <h2 className="mt-8 text-xl font-semibold">You don&apos;t have any activity yet</h2>
      <p className="mt-2 max-w-sm text-muted">
        That&apos;s okay, maybe you just need the right inspiration.{' '}
        {community ? `Check out r/${community.name}, a popular community for discussion.` : 'Check out Popular for discussion.'}
      </p>
      <Link to={community ? `/r/${community.name}` : '/popular'} className="mt-8 rounded-full bg-input px-5 py-3 text-sm font-semibold hover:bg-hover">
        {community ? `Visit r/${community.name}` : 'Visit Popular'}
      </Link>
    </div>
  );
}

function NotificationsView() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications();
  const hasUnread = (data?.unreadCount ?? 0) > 0;

  // Opening the page marks everything as read. The list keeps its "unread" dots until you leave,
  // so only the bell counter is reset here.
  useEffect(() => {
    if (!hasUnread) return;
    api.post('/notifications/read-all').then(() => queryClient.setQueryData(['notifications', 'unread'], 0));
  }, [hasUnread, queryClient]);

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">Notifications</h1>
      {isLoading && <div className="skeleton h-20" />}
      {data && data.items.length === 0 && <EmptyState />}
      {data?.items.map((n) => (
        <Row key={n.id} n={n} />
      ))}
    </>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsView />
    </RequireAuth>
  );
}