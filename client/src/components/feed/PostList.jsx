import { useInfinitePosts } from '../../hooks/useInfinitePosts';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';

export default function PostList({ path, controls, canModerate = false, showJoin = true, empty = 'Nothing here yet.' }) {
  const { sort, range, view } = controls;
  const query = useInfinitePosts(path, { sort, range });
  const sentinel = useInfiniteScroll(query.fetchNextPage, Boolean(query.hasNextPage) && !query.isFetchingNextPage);

  if (query.isLoading) return Array.from({ length: 4 }, (_, i) => <PostSkeleton key={i} />);

  if (query.isError) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-line">
        <p className="text-muted">Could not load posts.</p>
        <button onClick={() => query.refetch()} className="mt-3 rounded-full bg-btn px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Try again
        </button>
      </div>
    );
  }

  // Dedupe by id: "hot" ordering can shift slightly between pages while time passes.
  const posts = [...new Map(query.data.pages.flatMap((page) => page.items).map((p) => [p.id, p])).values()];

  if (posts.length === 0) return <p className="py-16 text-center text-muted">{empty}</p>;

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} compact={view === 'compact'} canModerate={canModerate} showJoin={showJoin} />
      ))}
      <div ref={sentinel} />
      {query.isFetchingNextPage && <PostSkeleton />}
      {!query.hasNextPage && <p className="py-6 text-center text-xs text-muted">You've reached the end</p>}
    </div>
  );
}