import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Navbar from './Navbar';
import RightSidebar from './RightSidebar';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const { pathname } = useLocation();
  // pinned = the sidebar is open and pushes the page. When it is collapsed, only a thin rail stays
  // and hovering that rail "peeks" the full sidebar on top of the page until the mouse leaves.
  const [pinned, setPinned] = useState(() => window.innerWidth >= 1024);
  const [hovering, setHovering] = useState(false);
  // The right rail element; pages can portal extra cards into it (e.g. "About community").
  const [railEl, setRailEl] = useState(null);
  const expanded = pinned || hovering;

  // On phones the sidebar is an overlay, so close it after navigating.
  useEffect(() => {
    if (window.innerWidth < 1024) setPinned(false);
  }, [pathname]);

  return (
    <>
      <Navbar onToggleSidebar={() => setPinned((p) => !p)} />

      {pinned && <div onClick={() => setPinned(false)} className="fixed inset-0 top-14 z-20 bg-black/50 lg:hidden" />}

      {/* One wrapper owns the hover events, so moving between the rail, the sidebar and the edge button never flickers. */}
      <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
        <div
          className={`fixed bottom-0 left-0 top-14 z-30 overflow-hidden border-r border-line bg-app transition-[width,transform] duration-150 ${
            expanded ? 'w-[270px]' : 'w-12'
          } ${pinned ? '' : 'max-lg:-translate-x-full'} ${expanded && !pinned ? 'shadow-2xl' : ''}`}
        >
          <Sidebar visible={expanded} />
        </div>
        <button
          onClick={() => setPinned((p) => !p)}
          style={{ left: expanded ? 270 : 48 }}
          className="fixed top-[68px] z-40 hidden h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-app transition-[left] duration-150 hover:bg-hover lg:flex"
          aria-label={pinned ? 'Collapse sidebar' : 'Pin sidebar'}
        >
          <Menu size={16} />
        </button>
      </div>

      <div className={`pt-14 transition-[margin] duration-150 ${pinned ? 'lg:ml-[270px]' : 'lg:ml-12'}`}>
        <div className="mx-auto flex max-w-[1100px] justify-center gap-6 px-3 py-4 sm:px-4">
          <main className="min-w-0 w-full max-w-[740px]">
            <Outlet context={{ railEl }} />
          </main>
          <RightSidebar slotRef={setRailEl} />
        </div>
      </div>
    </>
  );
}