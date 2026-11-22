import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// Full-screen image viewer: Esc closes, the arrow keys (or buttons) move between images.
export default function Lightbox({ urls, index, onChange, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onChange((index - 1 + urls.length) % urls.length);
      if (event.key === 'ArrowRight') onChange((index + 1) % urls.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden'; // the page behind must not scroll
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, urls.length, onChange, onClose]);

  const button = 'absolute flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30';
  const step = (delta) => (event) => {
    event.stopPropagation();
    onChange((index + delta + urls.length) % urls.length);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={onClose}>
      <img src={urls[index]} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[94vw] object-contain" />
      <button onClick={onClose} className={`${button} right-4 top-4`} aria-label="Close"><X size={22} /></button>
      {urls.length > 1 && (
        <>
          <button onClick={step(-1)} className={`${button} left-4 top-1/2 -translate-y-1/2`} aria-label="Previous"><ChevronLeft size={24} /></button>
          <button onClick={step(1)} className={`${button} right-4 top-1/2 -translate-y-1/2`} aria-label="Next"><ChevronRight size={24} /></button>
          <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white">{index + 1} / {urls.length}</span>
        </>
      )}
    </div>,
    document.body,
  );
}