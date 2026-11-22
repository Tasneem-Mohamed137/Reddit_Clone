import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

// Collapsible AI summary card: loading skeleton, error state with retry, and the result.
export default function SummaryPanel({ mutation, onRetry }) {
  const [open, setOpen] = useState(true);
  if (mutation.isIdle) return null;

  return (
    <section className="mt-3 rounded-2xl bg-input/60 p-4 ring-1 ring-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} className="text-brand" /> AI summary
        <span className="ml-auto text-muted">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {open && (
        <div className="mt-3">
          {mutation.isPending && (
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          )}
          {mutation.isError && (
            <div className="text-sm">
              <p className="text-danger">{mutation.error.response?.data?.error?.message ?? 'Could not generate a summary.'}</p>
              <button onClick={onRetry} className="mt-2 font-medium text-link hover:underline">Try again</button>
            </div>
          )}
          {mutation.isSuccess && <p className="rtl-aware whitespace-pre-line text-sm leading-relaxed">{mutation.data.summary}</p>}
        </div>
      )}
    </section>
  );
}