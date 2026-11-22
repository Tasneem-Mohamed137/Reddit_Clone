import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

export default function Dropdown({ label, items, onSelect, align = 'left' }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium hover:bg-hover">
        {label}
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className={`absolute top-9 z-30 min-w-40 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                onSelect(item.value);
                setOpen(false);
              }}
              className="flex w-full px-4 py-2 text-left text-sm hover:bg-hover"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}