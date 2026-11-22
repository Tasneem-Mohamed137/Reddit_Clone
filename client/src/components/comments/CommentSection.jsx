import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { buildTree } from '../../utils/comments';
import Dropdown from '../ui/Dropdown';
import CommentForm from './CommentForm';
import CommentNode from './CommentNode';

const SORTS = [
  { value: 'best', label: 'Best' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
];

export default function CommentSection({ postId, canModerate }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const [sort, setSort] = useState('best');
  const [composing, setComposing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['comments', postId, sort],
    queryFn: async () => (await api.get(`/posts/${postId}/comments`, { params: { sort } })).data.items,
  });
  const tree = useMemo(() => buildTree(data ?? []), [data]);

  // Runs a request, shows an error toast on failure (and rethrows so forms keep their text),
  // then refreshes the comments and the post's comment counter.
  const run = async (request, message) => {
    try {
      await request();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
      throw err;
    }
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
    if (message) toast(message);
  };

  const actions = {
    create: (body) => run(() => api.post(`/posts/${postId}/comments`, { body })),
    reply: (id, body) => run(() => api.post(`/comments/${id}/replies`, { body })),
    edit: (id, body) => run(() => api.patch(`/comments/${id}`, { body })),
    remove: (id) => run(() => api.delete(`/comments/${id}`), 'Comment deleted'),
  };

  return (
    <section className="mt-4">
      {composing ? (
        <CommentForm
          autoFocus
          placeholder="What are your thoughts?"
          onCancel={() => setComposing(false)}
          onSubmit={async (body) => {
            await actions.create(body);
            setComposing(false);
          }}
        />
      ) : (
        <button onClick={() => requireAuth() && setComposing(true)} className="h-10 w-full rounded-full border border-line px-4 text-left text-sm text-muted hover:bg-hover">
          Join the conversation
        </button>
      )}

      <div className="my-3 flex items-center text-xs text-muted">
        Sort by:
        <Dropdown label={SORTS.find((s) => s.value === sort).label} items={SORTS} onSelect={setSort} />
      </div>

      {isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton mb-3 h-16" />)}
      {isError && <p className="text-sm text-danger">Could not load comments.</p>}
      {data && tree.length === 0 && (
        <p className="py-10 text-center text-muted">No comments yet. Be the first to share what you think!</p>
      )}
      {tree.map((comment) => (
        <CommentNode key={comment.id} comment={comment} depth={0} actions={actions} canModerate={canModerate} />
      ))}
    </section>
  );
}