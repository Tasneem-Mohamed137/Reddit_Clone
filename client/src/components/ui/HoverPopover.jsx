import { useEffect, useRef, useState } from 'react';

// Shows `content` in a floating card when the mouse rests on the trigger for a moment.
// `content` is only mounted while open, so any data it loads is fetched on the first hover.
export default function HoverPopover({ children, content }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 350);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (
        // The padding bridges the gap between the trigger and the card, so the mouse can travel onto it.
        <span className="absolute left-0 top-full z-50 block pt-2">
          <span className="block w-72 rounded-2xl border border-line bg-card p-4 text-left shadow-xl">{content}</span>
        </span>
      )}
    </span>
  );
}