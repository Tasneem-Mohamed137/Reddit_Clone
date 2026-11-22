import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, MessageSquare, Pencil, Share2, Sparkles } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import CommentSection from '../components/comments/CommentSection';
import PostMedia from '../components/feed/PostMedia';
import PostMenu from '../components/feed/PostMenu';
import VotePill from '../components/feed/VotePill';
import MediaTray from '../components/post/MediaTray';
import RichTextEditor from '../components/post/RichTextEditor';
import SummaryPanel from '../components/post/SummaryPanel';
import Avatar from '../components/ui/Avatar';
import Markdown from '../components/ui/Markdown';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCommunity } from '../hooks/useCommunity';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { formatCount, hostOf, postPath, timeAgo } from '../utils/format';

const pill = 'flex h-8 items-center gap-1.5 rounded-full bg-input px-3 text-xs font-medium hover:bg-line';

export default function PostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftMedia, setDraftMedia] = useState([]);
  const { upload, uploading } = useMediaUpload(setDraftMedia, draftMedia.length);

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => (await api.get(`/posts/${postId}`)).data.post,
    retry: false,
  });
  const post = postQuery.data;
  const community = useCommunity(post?.community.name);

  const summarize = useMutation({ mutationFn: async () => (await api.post(`/posts/${postId}/summarize`)).data });

  const save = useMutation({
    mutationFn: async () => (await api.patch(`/posts/${postId}`, { body: draft, mediaUrls: draftMedia })).data.post,
    onSuccess: (updated) => {
      queryClient.setQueryData(['post', postId], updated);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      summarize.reset(); // the server drops its cached summary on edit, so ours is outdated too
      setEditing(false);
      toast('Post updated');
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  if (postQuery.isLoading) return <div className="skeleton h-64" />;
  if (postQuery.isError) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Post not found</h1>
        <Link to="/" className="mt-4 inline-block rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Back to Home</Link>
      </div>
    );
  }

  const tags = post.tags ?? [];
  const isAuthor = Boolean(user && post.author?.username === user.username);
  const startEditing = () => {
    setDraft(post.body);
    setDraftMedia(post.mediaUrls);
    setEditing(true);
  };
  const share = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${postPath(post)}`);
    toast('Link copied');
  };

  return (
    <>
      <article className="p-1 sm:p-3">
        <header className="flex items-center gap-2 text-xs text-muted">
          <Link to={`/r/${post.community.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-input hover:bg-line" aria-label="Back to community">
            <ArrowLeft size={18} />
          </Link>
          <Avatar name={post.community.name} src={post.community.iconUrl} size={28} />
          <div className="leading-tight">
            <Link to={`/r/${post.community.name}`} className="font-medium text-ink hover:underline">r/{post.community.name}</Link>
            <span> • {timeAgo(post.createdAt)}</span>
            {post.edited && <span> • edited</span>}
            <div>
              {post.author ? <Link to={`/user/${post.author.username}`} className="hover:underline">u/{post.author.username}</Link> : '[deleted]'}
            </div>
          </div>
          <div className="ml-auto">
            <PostMenu post={post} canModerate={Boolean(community.data?.isModerator)} onDeleted={() => navigate(`/r/${post.community.name}`)} />
          </div>
        </header>

        <h1 className="rtl-aware mt-3 text-xl font-semibold leading-snug">{post.title}</h1>
        {tags.length > 0 && (
          <div className="mt-1 flex gap-1">
            {tags.map((tag) => (
              <span key={tag} className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tag === 'nsfw' ? 'bg-danger text-white' : 'bg-input text-ink'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {editing ? (
          <div className="mt-3">
            <RichTextEditor value={draft} onChange={setDraft} rows={6} placeholder="Body text (optional)" onUpload={upload} uploading={uploading} />
            <MediaTray urls={draftMedia} onRemove={(url) => setDraftMedia((list) => list.filter((u) => u !== url))} />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="h-8 rounded-full px-4 text-xs font-semibold hover:bg-hover">Cancel</button>
              <button onClick={() => save.mutate()} disabled={save.isPending || uploading} className="h-8 rounded-full bg-btn px-4 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {save.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.body && <Markdown className="mt-3">{post.body}</Markdown>}
            {post.mediaUrls.length > 0 && <PostMedia urls={post.mediaUrls} tags={tags} height={520} />}
          </>
        )}

        {post.linkUrl && (
          <a href={post.linkUrl} target="_blank" rel="noreferrer noopener" className="mt-3 flex items-center gap-2 rounded-2xl border border-line p-3 text-sm text-link hover:bg-hover">
            <ExternalLink size={16} /> {hostOf(post.linkUrl)}
          </a>
        )}

        <footer className="mt-4 flex flex-wrap items-center gap-2">
          <VotePill post={post} />
          <span className={pill}><MessageSquare size={16} /> {formatCount(post.commentCount)}</span>
          <button onClick={share} className={pill}><Share2 size={16} /> Share</button>
          <button onClick={() => requireAuth() && summarize.mutate()} disabled={summarize.isPending} className={`${pill} disabled:opacity-50`}>
            <Sparkles size={16} className="text-brand" /> Summarize
          </button>
          {isAuthor && !editing && (
            <button onClick={startEditing} className={pill}>
              <Pencil size={16} /> Edit
            </button>
          )}
        </footer>

        <SummaryPanel mutation={summarize} onRetry={() => summarize.mutate()} />
      </article>

      <CommentSection postId={post.id} canModerate={Boolean(community.data?.isModerator)} />
    </>
  );
}