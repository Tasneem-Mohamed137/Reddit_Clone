// Simplified snoo mark + wordmark.
export function Snoo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#FF4500" />
      <ellipse cx="16" cy="18.5" rx="8.5" ry="6" fill="#fff" />
      <circle cx="21.5" cy="9" r="2" fill="#fff" />
      <circle cx="9.2" cy="14" r="2.2" fill="#fff" />
      <circle cx="22.8" cy="14" r="2.2" fill="#fff" />
      <circle cx="12.8" cy="17" r="1.6" fill="#FF4500" />
      <circle cx="19.2" cy="17" r="1.6" fill="#FF4500" />
      <path d="M12.5 21c1.9 1.4 5.1 1.4 7 0" stroke="#FF4500" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M16 12.5l1.4-4.3 4.1.8" stroke="#fff" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <Snoo />
      <span className="hidden text-[22px] font-bold tracking-tight text-brand sm:inline">reddit</span>
    </span>
  );
}