import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import PostList from '../components/feed/PostList';
import Avatar from '../components/ui/Avatar';
import { formatCount } from '../utils/format';

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'communities', label: 'Communities' },
  { id: 'users', label: 'People' },
];

// Search results are not sorted by the feed controls, so the list gets fixed ones.
const FIXED_CONTROLS = { sort: 'new', range: 'all', view: 'card' };

function CommunityRow({ c }) {
  return (
    <Link to={`/r/${c.name}`} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-hover">
      <Avatar name={c.name} src={c.iconUrl} size={40} />
      <div className="min-w-0">
        <div className="text-sm font-medium">r/{c.name}</div>
        <div className="text-xs text-muted">{formatCount(c.memberCount)} members</div>
        {c.description && <p className="rtl-aware mt-0.5 line-clamp-1 text-xs text-muted">{c.description}</p>}
      </div>
    </Link>
  );
}

function UserRow({ u }) {
  return (
    <Link to={`/user/${u.username}`} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-hover">
      <Avatar name={u.username} src={u.avatarUrl} size={40} />
      <div>
        <div className="text-sm font-medium">u/{u.username}</div>
        <div className="rtl-aware text-xs text-muted">{u.displayName}</div>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = params.get('type') ?? 'posts';

  const results = useQuery({
    queryKey: ['search-page', type, q],
    queryFn: async () => (await api.get('/search', { params: { q, type, limit: 50 } })).data.items,
    enabled: q.length > 0 && type !== 'posts', // posts go through PostList so votes and menus keep working
  });
  // Without a query this page doubles as "Explore": the biggest communities.
  const explore = useQuery({
    queryKey: ['communities', 'explore'],
    queryFn: async () => (await api.get('/communities', { params: { limit: 50 } })).data.items,
    enabled: q.length === 0,
  });

  if (!q) {
    return (
      <>
        <h1 className="mb-2 text-xl font-semibold">Explore communities</h1>
        {explore.isLoading && <div className="skeleton h-24" />}
        {explore.data?.map((c) => <CommunityRow key={c.id} c={c} />)}
      </>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Results for &quot;{q}&quot;</h1>
      <div className="mb-2 flex gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setParams({ q, type: t.id })} className={`h-9 rounded-full px-4 text-sm font-medium ${type === t.id ? 'bg-hover' : 'text-muted hover:bg-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {type === 'posts' ? (
        <PostList key={q} path="/search" controls={FIXED_CONTROLS} params={{ q, type: 'posts', limit: 50 }} empty="No posts found." />
      ) : (
        <>
          {results.isLoading && <div className="skeleton h-24" />}
          {results.data?.length === 0 && <p className="py-16 text-center text-muted">No results found.</p>}
          {results.data?.map((item) => (type === 'users' ? <UserRow key={item.id} u={item} /> : <CommunityRow key={item.id} c={item} />))}
        </>
      )}
    </>
  );
}