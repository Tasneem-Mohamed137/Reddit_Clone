import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MessageSquare, Pin, Share2, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useMembership } from '../../hooks/useMembership';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatCount, hostOf, isVideoUrl, postPath, timeAgo } from '../../utils/format';
import { CommunityHover } from '../people/HoverCards';
import Avatar from '../ui/Avatar';
import Markdown from '../ui/Markdown';
import PostMedia from './PostMedia';
import PostMenu from './PostMenu';
import VotePill from './VotePill';

const pill = 'flex h-8 items-center gap-1.5 rounded-full bg-input px-3 text-xs font-medium hover:bg-line';

function LinkChip({ url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="mt-2 flex items-center gap-1.5 text-xs text-link hover:underline">
      <ExternalLink size={14} /> {hostOf(url)}
    </a>
  );
}

function TagBadges({ tags }) {
  return tags.map((tag) => (
    <span key={tag} className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tag === 'nsfw' ? 'bg-danger text-white' : 'bg-input text-ink'}`}>
      {tag}
    </span>
  ));
}

// `active` is the post highlighted by the j/k keyboard shortcuts.
export default function PostCard({ post, compact = false, canModerate = false, showJoin = true, active = false }) {
  const [hidden, setHidden] = useState(false);
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const membership = useMembership();
  if (hidden) return null;

  const path = postPath(post);
  const tags = post.tags ?? [];
  // Compact rows show a small thumbnail of the first photo (videos have no thumbnail).
  const thumbnail = post.mediaUrls.find((url) => !isVideoUrl(url));

  const share = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast('Link copied');
  };
  const join = () => {
    if (requireAuth()) membership.mutate({ name: post.community.name, join: true });
  };

  return (
    <article id={`post-${post.id}`} className={`border-b border-line py-1 ${active ? 'rounded-2xl ring-2 ring-link' : ''}`}>
      <div className="rounded-2xl p-3 hover:bg-hover">
        <header className="flex items-center gap-2 text-xs text-muted">
          <CommunityHover name={post.community.name}>
            <Link to={`/r/${post.community.name}`} className="flex items-center gap-2 font-medium text-ink hover:underline">
              <Avatar name={post.community.name} src={post.community.iconUrl} size={24} />
              r/{post.community.name}
            </Link>
          </CommunityHover>
          <span>• {timeAgo(post.createdAt)}</span>
          {post.pinned && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-500"><Pin size={12} /> Pinned</span>
          )}
          {showJoin && !post.isJoined && (
            <button onClick={join} disabled={membership.isPending} className="ml-1 h-7 rounded-full bg-btn px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
              Join
            </button>
          )}
          <div className="ml-auto flex items-center">
            <PostMenu post={post} canModerate={canModerate} />
            <button onClick={() => setHidden(true)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-input" aria-label="Dismiss">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className={compact ? 'mt-1 flex gap-3' : ''}>
          <div className="min-w-0 flex-1">
            <Link to={path} className="rtl-aware mt-2 block text-[18px] font-semibold leading-snug">
              {post.title}
            </Link>
            {tags.length > 0 && (
              <div className="mt-1 flex gap-1">
                <TagBadges tags={tags} />
              </div>
            )}
            {!compact && post.body && (
              <Markdown className="mt-2 max-h-20 overflow-hidden text-muted [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
                {post.body}
              </Markdown>
            )}
            {post.linkUrl && <LinkChip url={post.linkUrl} />}
          </div>
          {compact && thumbnail && (
            <img src={thumbnail} alt="" className={`h-[72px] w-[72px] shrink-0 rounded-lg object-cover ${tags.length ? 'blur-md' : ''}`} />
          )}
        </div>

        {!compact && post.mediaUrls.length > 0 && <PostMedia urls={post.mediaUrls} tags={tags} />}

        <footer className="mt-3 flex items-center gap-2">
          <VotePill post={post} />
          <Link to={path} className={pill}>
            <MessageSquare size={16} /> {formatCount(post.commentCount)}
          </Link>
          <button onClick={share} className={pill}>
            <Share2 size={16} /> Share
          </button>
        </footer>
      </div>
    </article>
  );
}