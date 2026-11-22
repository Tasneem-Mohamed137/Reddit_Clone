import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { countDescendants } from '../../utils/comments';
import { timeAgo } from '../../utils/format';
import Avatar from '../ui/Avatar';
import CommentForm from './CommentForm';
import Markdown from '../ui/Markdown';

const MAX_DEPTH = 8; // replies below this depth are behind a "Load more replies" button
const actionBtn = 'flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-muted hover:bg-input';

export default function CommentNode({ comment, depth, actions, canModerate }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeep, setShowDeep] = useState(false);

  const author = comment.author;
  const isAuthor = Boolean(user && author?.username === user.username);
  const canDelete = isAuthor || canModerate;
  const deepHidden = depth >= MAX_DEPTH && !showDeep && comment.children.length > 0;

  if (collapsed) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted">
        <button onClick={() => setCollapsed(false)} className="flex h-6 w-6 items-center justify-center rounded-full bg-input hover:bg-line" aria-label="Expand thread">
          <Plus size={14} />
        </button>
        <span className="font-medium text-ink">{author ? `u/${author.username}` : '[deleted]'}</span>
        <span>• {timeAgo(comment.createdAt)}</span>
      </div>
    );
  }

  const remove = () => {
    if (window.confirm('Delete this comment?')) actions.remove(comment.id).catch(() => {});
  };

  return (
    <div className="flex gap-2">
      <div className="flex w-8 shrink-0 flex-col items-center">
        {author ? <Avatar name={author.username} src={author.avatarUrl} size={28} /> : <div className="h-7 w-7 rounded-full bg-input" />}
        <button onClick={() => setCollapsed(true)} className="group mt-1 flex w-4 flex-1 justify-center" aria-label="Collapse thread">
          <span className="w-px bg-line group-hover:bg-muted" />
        </button>
      </div>

      <div className="min-w-0 flex-1 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {author ? (
            <Link to={`/user/${author.username}`} className="font-medium text-ink hover:underline">u/{author.username}</Link>
          ) : (
            <span>[deleted]</span>
          )}
          <span>• {timeAgo(comment.createdAt)}</span>
          {comment.edited && <span>• edited</span>}
        </div>

        {editing ? (
          <div className="mt-1">
            <CommentForm
              initial={comment.body}
              autoFocus
              submitLabel="Save"
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                await actions.edit(comment.id, body);
                setEditing(false);
              }}
            />
          </div>
        ) : (
            comment.deleted ? (
            <p className="mt-1 text-sm italic text-muted">{comment.body}</p>
          ) : (
            <Markdown className="mt-1">{comment.body}</Markdown>
          )
        )}

        {!comment.deleted && !editing && (
          <div className="-ml-2 mt-1 flex items-center">
            <button onClick={() => requireAuth() && setReplying((r) => !r)} className={actionBtn}>
              <MessageSquare size={14} /> Reply
            </button>
            {isAuthor && (
              <button onClick={() => setEditing(true)} className={actionBtn}><Pencil size={14} /> Edit</button>
            )}
            {canDelete && (
              <button onClick={remove} className={actionBtn}>
                <Trash2 size={14} /> {isAuthor ? 'Delete' : 'Remove'}
              </button>
            )}
          </div>
        )}

        {replying && (
          <div className="mt-2">
            <CommentForm
              autoFocus
              placeholder="What are your thoughts?"
              submitLabel="Reply"
              onCancel={() => setReplying(false)}
              onSubmit={async (body) => {
                await actions.reply(comment.id, body);
                setReplying(false);
                setShowDeep(true);
              }}
            />
          </div>
        )}

        <div className="mt-2">
          {deepHidden ? (
            <button onClick={() => setShowDeep(true)} className="text-xs font-medium text-link hover:underline">
              Load more replies ({countDescendants(comment)})
            </button>
          ) : (
            comment.children.map((child) => (
              <CommentNode key={child.id} comment={child} depth={depth + 1} actions={actions} canModerate={canModerate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}