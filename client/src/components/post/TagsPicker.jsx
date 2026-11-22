import { useRef, useState } from 'react';
import { Check, Tag } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

const TAGS = [
  { id: 'nsfw', label: 'NSFW', hint: 'Not safe for work. Media is hidden until clicked.' },
  { id: 'spoiler', label: 'Spoiler', hint: 'Media is hidden until clicked.' },
];

export default function TagsPicker({ value, onChange }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useClickOutside(ref, () => setOpen(false));

  const toggle = (id) => onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-muted hover:bg-hover">
        <Tag size={16} />
        {value.length ? TAGS.filter((t) => value.includes(t.id)).map((t) => t.label).join(', ') : 'Add tags'}
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-30 w-72 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl">
          {TAGS.map((tag) => (
            <button key={tag.id} type="button" onClick={() => toggle(tag.id)} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-hover">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line">
                {value.includes(tag.id) && <Check size={14} />}
              </span>
              <span>
                <span className="block text-sm font-medium">{tag.label}</span>
                <span className="block text-xs text-muted">{tag.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}