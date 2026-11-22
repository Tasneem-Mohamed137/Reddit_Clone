import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'hate', label: 'Hate' },
  { id: 'violence', label: 'Violence' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'other', label: 'Something else' },
];

export default function ReportModal({ busy, onSubmit, onClose }) {
  const [reason, setReason] = useState('');

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl bg-card p-6 ring-1 ring-line" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-input hover:bg-hover" aria-label="Close">
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold">Report this post</h2>
        <p className="mb-3 text-xs text-muted">Tell the moderators what is wrong.</p>
        {REASONS.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-hover">
            <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />
            <span className="text-sm">{r.label}</span>
          </label>
        ))}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-full bg-input px-4 text-sm font-semibold hover:bg-hover">Cancel</button>
          <button onClick={() => onSubmit(reason)} disabled={!reason || busy} className="h-9 rounded-full bg-btn px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {busy ? 'Sending...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}