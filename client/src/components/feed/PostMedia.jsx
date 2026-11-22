import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { isVideoUrl } from '../../utils/format';

// Rounded media box: images get a blurred copy of themselves behind, videos get native controls,
// a file that fails to load shows a message, and NSFW/Spoiler posts stay covered until clicked.
export default function PostMedia({ urls, height = 420, tags = [] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(() => new Set());
  const [revealed, setRevealed] = useState(false);
  if (!urls?.length) return null;

  const current = Math.min(index, urls.length - 1); // the list can shrink after an edit
  const url = urls[current];
  const video = isVideoUrl(url);
  const broken = failed.has(url);
  const covered = tags.length > 0 && !revealed;
  const markFailed = () => setFailed((set) => new Set(set).add(url));
  const go = (delta) => () => setIndex((i) => (Math.min(i, urls.length - 1) + delta + urls.length) % urls.length);
  const arrow = 'absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80';

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl bg-black" style={{ height }}>
      {!video && !broken && (
        <img src={url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
      )}

      {broken ? (
        <div className="relative flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
          <ImageOff size={32} /> Could not load this {video ? 'video' : 'image'}
        </div>
      ) : video ? (
        <video key={url} src={url} controls playsInline preload="metadata" onError={markFailed} className="relative h-full w-full object-contain" />
      ) : (
        <img key={url} src={url} alt="" onError={markFailed} className="relative h-full w-full object-contain" />
      )}

      {urls.length > 1 && (
        <>
          <button onClick={go(-1)} className={`${arrow} left-2`} aria-label="Previous"><ChevronLeft size={20} /></button>
          <button onClick={go(1)} className={`${arrow} right-2`} aria-label="Next"><ChevronRight size={20} /></button>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {current + 1}/{urls.length}
          </span>
        </>
      )}

      {covered && (
        <button onClick={() => setRevealed(true)} className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 backdrop-blur-2xl">
          <span className="text-lg font-bold text-white">{tags.includes('nsfw') ? 'NSFW' : 'Spoiler'}</span>
          <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white">Click to view</span>
        </button>
      )}
    </div>
  );
}