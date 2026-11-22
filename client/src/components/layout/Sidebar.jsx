import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Compass, Home, Plus, TrendingUp, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRecentCommunities } from '../../hooks/useRecentCommunities';
import Avatar from '../ui/Avatar';

const row = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-hover ${isActive ? 'bg-hover font-medium' : ''}`;

const Divider = () => <hr className="my-2 border-line" />;

// A section with a chevron that collapses it; the choice is remembered.
function Section({ id, title, children }) {
  const [open, setOpen] = useState(() => localStorage.getItem(`sidebar_${id}`) !== 'closed');

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(`sidebar_${id}`, next ? 'open' : 'closed');
  };

  return (
    <section>
      <button onClick={toggle} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted hover:bg-hover">
        {title}
        <ChevronDown size={16} className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && children}
    </section>
  );
}

// `visible` is false while the sidebar is collapsed to its rail: the content is hidden but keeps its size.
export default function Sidebar({ visible }) {
  const { user, guardLink } = useAuth();
  const recent = useRecentCommunities();

  const joined = useQuery({
    queryKey: ['communities', 'joined'],
    queryFn: async () => (await api.get('/users/me/communities')).data.items,
    enabled: Boolean(user),
  });

  return (
    <aside className={`h-full w-[270px] overflow-y-auto p-3 ${visible ? '' : 'invisible'}`}>
      <nav>
        <NavLink to="/" end className={row}><Home size={20} /> Home</NavLink>
        <NavLink to="/popular" className={row}><TrendingUp size={20} /> Popular</NavLink>
        <NavLink to="/search" className={row}><Compass size={20} /> Explore</NavLink>
        <NavLink to="/people" className={row}><Users size={20} /> People</NavLink>
        <NavLink to="/communities/create" onClick={guardLink} className={row}><Plus size={20} /> Start a community</NavLink>
      </nav>

      <Divider />
      <Section id="communities" title="Communities">
        <NavLink to="/communities/create" onClick={guardLink} className={row}>
          <Plus size={20} /> Create community
        </NavLink>
        {joined.data?.map((c) => (
          <NavLink key={c.id} to={`/r/${c.name}`} className={row}>
            <Avatar name={c.name} src={c.iconUrl} size={24} /> r/{c.name}
          </NavLink>
        ))}
        {!user && <p className="px-3 py-2 text-xs text-muted">Log in to see the communities you joined.</p>}
      </Section>

      {recent.length > 0 && (
        <>
          <Divider />
          <Section id="recent" title="Recent">
            {recent.map((c) => (
              <NavLink key={c.name} to={`/r/${c.name}`} className={row}>
                <Avatar name={c.name} src={c.iconUrl} size={24} /> r/{c.name}
              </NavLink>
            ))}
          </Section>
        </>
      )}
    </aside>
  );
}