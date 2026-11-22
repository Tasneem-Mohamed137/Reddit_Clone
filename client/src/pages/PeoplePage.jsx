import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../api/client';
import RequireAuth from '../components/auth/RequireAuth';
import PersonRow from '../components/people/PersonRow';
import { useDebounce } from '../hooks/useDebounce';
import { useConnections, useSuggestions } from '../hooks/useSocial';

const TABS = [
  { id: 'suggestions', label: 'People you may know', empty: 'No suggestions right now.' },
  { id: 'following', label: 'Following', empty: 'You are not following anyone yet.' },
  { id: 'followers', label: 'Followers', empty: 'Nobody follows you yet.' },
];

function PeopleView() {
  const [tab, setTab] = useState('suggestions');
  const [text, setText] = useState('');
  const q = useDebounce(text.trim().replace(/^u\//i, ''), 300);

  const lists = { suggestions: useSuggestions(30), following: useConnections('following'), followers: useConnections('followers') };
  const search = useQuery({
    queryKey: ['search', 'users', q, 'people'],
    queryFn: async () => (await api.get('/search', { params: { q, type: 'users', limit: 30 } })).data.items,
    enabled: q.length > 0,
  });

  const active = TABS.find((t) => t.id === tab);
  const query = q ? search : lists[tab];

  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">Find people</h1>
      <div className="flex h-10 items-center gap-2 rounded-full bg-input px-4 focus-within:ring-1 focus-within:ring-link">
        <Search size={18} className="text-muted" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search people by username" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
      </div>

      {!q && (
        <div className="my-3 flex gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`h-9 rounded-full px-4 text-sm font-medium ${tab === t.id ? 'bg-hover' : 'text-muted hover:bg-hover'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {query.isLoading && <div className="skeleton h-16" />}
        {query.data?.length === 0 && <p className="py-12 text-center text-muted">{q ? 'No people found.' : active.empty}</p>}
        {query.data?.map((person) => (
          <PersonRow key={person.id} person={person} />
        ))}
      </div>
    </>
  );
}

export default function PeoplePage() {
  return (
    <RequireAuth>
      <PeopleView />
    </RequireAuth>
  );
}