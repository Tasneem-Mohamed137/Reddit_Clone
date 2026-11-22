import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, EyeOff, Flag, Link2, MoreHorizontal, Pin, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { usePostActions } from '../../hooks/usePostActions';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { postPath } from '../../utils/format';
import ReportModal from './ReportModal';

const item = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-hover';

export default function PostMenu({ post, canModerate = false, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();
  const actions = usePostActions();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  useClickOutside(ref, () => setOpen(false));

  const isAuthor = Boolean(user && post.author?.username === user.username);
  // The server enforces this too (403); here we only decide whether to show the button.
  const canDelete = isAuthor || canModerate;

  const remove = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id], refetchType: 'none' });
      toast(isAuthor ? 'Post deleted' : 'Post removed');
      onDeleted?.();
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  // Closes the menu, then runs the action only when logged in (otherwise the login modal opens).
  const run = (fn) => () => {
    setOpen(false);
    if (requireAuth()) fn();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${postPath(post)}`);
    toast('Link copied');
    setOpen(false);
  };

  const confirmDelete = run(() => {
    if (window.confirm(isAuthor ? 'Delete this post?' : 'Remove this post from the community?')) remove.mutate();
  });

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-input" aria-label="More options">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl">
          <button onClick={copyLink} className={item}><Link2 size={18} /> Copy link</button>
          <button onClick={run(() => actions.save.mutate({ postId: post.id, saved: !post.isSaved }))} className={item}>
            <Bookmark size={18} fill={post.isSaved ? 'currentColor' : 'none'} /> {post.isSaved ? 'Unsave' : 'Save'}
          </button>
          <button onClick={run(() => actions.hide.mutate({ postId: post.id, hidden: true }))} className={item}>
            <EyeOff size={18} /> Hide
          </button>
          {!isAuthor && (
            <button onClick={run(() => setReporting(true))} className={item}><Flag size={18} /> Report</button>
          )}
          {canModerate && (
            <button onClick={run(() => actions.pin.mutate({ postId: post.id, pinned: !post.pinned }))} className={item}>
              <Pin size={18} /> {post.pinned ? 'Unpin' : 'Pin to community'}
            </button>
          )}
          {canDelete && (
            <button onClick={confirmDelete} className={`${item} text-danger`}>
              <Trash2 size={18} /> {isAuthor ? 'Delete' : 'Remove'}
            </button>
          )}
        </div>
      )}

      {reporting && (
        <ReportModal
          busy={actions.report.isPending}
          onClose={() => setReporting(false)}
          onSubmit={(reason) => actions.report.mutate({ postId: post.id, reason }, { onSuccess: () => setReporting(false) })}
        />
      )}
    </div>
  );
}