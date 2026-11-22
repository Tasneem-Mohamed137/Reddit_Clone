import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, MoreHorizontal, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { postPath } from '../../utils/format';

const item = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-hover';

export default function PostMenu({ post, canModerate = false, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
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

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${postPath(post)}`);
    toast('Link copied');
    setOpen(false);
  };

  const confirmDelete = () => {
    setOpen(false);
    if (window.confirm(isAuthor ? 'Delete this post?' : 'Remove this post from the community?')) remove.mutate();
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-input" aria-label="More options">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl">
          <button onClick={copyLink} className={item}><Link2 size={18} /> Copy link</button>
          {canDelete && (
            <button onClick={confirmDelete} className={`${item} text-danger`}>
              <Trash2 size={18} /> {isAuthor ? 'Delete' : 'Remove'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}