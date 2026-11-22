const COLORS = ['#ff4500', '#0079d3', '#46d160', '#a06a42', '#7193ff', '#ea0027', '#ff66ac'];

// Stable colour per name, so the same community/user always gets the same fallback avatar.
const colorFor = (name = '') => COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length];

export default function Avatar({ name = '?', src, size = 32, online = false }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{ background: colorFor(name), fontSize: size * 0.42 }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-app bg-green-500" />
      )}
    </span>
  );
}