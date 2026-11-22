import { Trash2, X } from 'lucide-react';
import { timeAgo } from '../../utils/format';

export default function DraftsModal({ drafts, onLoad, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <div className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 ring-1 ring-line" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-input hover:bg-hover" aria-label="Close">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold">Drafts</h2>
        <p className="mb-3 text-xs text-muted">Saved in this browser only.</p>

        {drafts.length === 0 && <p className="py-8 text-center text-sm text-muted">No drafts yet.</p>}
        {drafts.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-hover">
            <button onClick={() => onLoad(d)} className="min-w-0 flex-1 text-left">
              <div className="rtl-aware truncate text-sm font-medium">{d.title || 'Untitled draft'}</div>
              <div className="text-xs text-muted">
                {d.community ? `r/${d.community.name} • ` : ''}
                {timeAgo(d.savedAt)}
              </div>
            </button>
            <button onClick={() => onDelete(d.id)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-input" aria-label="Delete draft">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}