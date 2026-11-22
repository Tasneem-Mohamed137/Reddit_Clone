import { useState } from 'react';
import RichTextEditor from '../post/RichTextEditor';

export default function CommentForm({ initial = '', placeholder = 'Add a comment', submitLabel = 'Comment', autoFocus = false, onSubmit, onCancel }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } catch {
      // The parent already showed an error toast; keep the text so nothing is lost.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <RichTextEditor value={text} onChange={setText} placeholder={placeholder} rows={3} autoFocus={autoFocus} />
      <div className="mt-2 flex justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="h-8 rounded-full px-4 text-xs font-semibold hover:bg-hover">Cancel</button>
        )}
        <button onClick={submit} disabled={busy || !text.trim()} className="h-8 rounded-full bg-btn px-4 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
          {busy ? 'Please wait...' : submitLabel}
        </button>
      </div>
    </div>
  );
}