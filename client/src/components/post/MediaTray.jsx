import { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { hostOf, isVideoUrl } from '../../utils/format';

function Thumb({ url, onRemove }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-input">
      {failed ? (
        <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-danger">Cannot load this file</div>
      ) : isVideoUrl(url) ? (
        <video src={url} muted preload="metadata" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      <button type="button" onClick={onRemove} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black" aria-label="Remove">
        <X size={14} />
      </button>
    </div>
  );
}

// Shows what is attached to a post (photos, videos and an optional link) with remove buttons.
export default function MediaTray({ urls, onRemove, linkUrl, onRemoveLink }) {
  if (urls.length === 0 && !linkUrl) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {urls.map((url) => (
        <Thumb key={url} url={url} onRemove={() => onRemove(url)} />
      ))}
      {linkUrl && (
        <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-link">
          <ExternalLink size={14} /> {hostOf(linkUrl)}
          {onRemoveLink && (
            <button type="button" onClick={onRemoveLink} aria-label="Remove link">
              <X size={14} />
            </button>
          )}
        </span>
      )}
    </div>
  );
}