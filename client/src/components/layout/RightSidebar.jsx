import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSuggestions } from '../../hooks/useSocial';
import PersonRow from '../people/PersonRow';
import Avatar from '../ui/Avatar';

const FOOTER_LINKS = ['Reddit Rules', 'Privacy Policy', 'User Agreement', 'Accessibility'];

function PeopleYouMayKnow() {
  const { user } = useAuth();
  const { data, isLoading } = useSuggestions(5);
  if (!user) return null;

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">People you may know</h2>
        <Link to="/people" className="text-xs font-medium text-link hover:underline">See all</Link>
      </div>
      {isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton my-2 h-9" />)}
      {data?.length === 0 && <p className="text-xs text-muted">No suggestions right now.</p>}
      {data?.map((person) => (
        <PersonRow key={person.id} person={person} compact />
      ))}
    </section>
  );
}

export default function RightSidebar({ slotRef }) {
  const { data, isLoading } = useQuery({
    queryKey: ['communities', 'popular'],
    queryFn: async () => (await api.get('/communities', { params: { limit: 5 } })).data.items,
  });

  return (
    <aside className="hidden w-[320px] shrink-0 lg:block">
      <div className="sticky top-[72px] max-h-[calc(100vh-88px)] space-y-3 overflow-y-auto">
        <div ref={slotRef} className="space-y-3 empty:hidden" />

        <PeopleYouMayKnow />

        <section className="rounded-2xl bg-card p-4 ring-1 ring-line">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Popular Communities</h2>
          {isLoading && Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton my-2 h-9" />)}
          {data?.map((c) => (
            <Link key={c.id} to={`/r/${c.name}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-hover">
              <Avatar name={c.name} src={c.iconUrl} size={32} />
              <div>
                <div className="text-sm font-medium">r/{c.name}</div>
                <div className="text-xs text-muted">{c.memberCount} members</div>
              </div>
            </Link>
          ))}
        </section>

        <footer className="rounded-2xl p-4 text-xs text-muted ring-1 ring-line">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
            {FOOTER_LINKS.map((label) => (
              <span key={label} className="cursor-pointer hover:underline">{label}</span>
            ))}
          </div>
          Reddit, Inc. © 2026. All rights reserved.
        </footer>
      </div>
    </aside>
  );
}