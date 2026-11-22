import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../../api/client';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useDebounce } from '../../hooks/useDebounce';
import Avatar from '../ui/Avatar';
import { Snoo } from '../ui/Logo';

const useSearch = (type, q) =>
  useQuery({
    queryKey: ['search', type, q],
    queryFn: async () => (await api.get('/search', { params: { q, type, limit: 4 } })).data.items,
    enabled: q.length > 0,
  });

export default function SearchBar() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const q = useDebounce(text.trim(), 300); // wait for the user to pause typing before calling the API

  const communities = useSearch('communities', q);
  const users = useSearch('users', q);
  useClickOutside(wrapperRef, () => setOpen(false));

  const close = () => {
    setOpen(false);
    setText('');
  };

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    navigate(`/search?q=${encodeURIComponent(text.trim())}`);
    setOpen(false);
  };

  const hasResults = (communities.data?.length ?? 0) + (users.data?.length ?? 0) > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[640px]">
      <form onSubmit={submit} className="flex h-10 items-center gap-2 rounded-full bg-input px-3 hover:bg-hover focus-within:ring-1 focus-within:ring-link">
        <Search size={18} className="text-muted" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search Reddit"
          className="rtl-aware w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </form>

      {open && q && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl">
          {communities.data?.map((c) => (
            <Link key={c.id} to={`/r/${c.name}`} onClick={close} className="flex items-center gap-3 px-4 py-2 hover:bg-hover">
              <Avatar name={c.name} src={c.iconUrl} size={28} />
              <div>
                <div className="text-sm font-medium">r/{c.name}</div>
                <div className="text-xs text-muted">{c.memberCount} members</div>
              </div>
            </Link>
          ))}
          {users.data?.map((u) => (
            <Link key={u.id} to={`/user/${u.username}`} onClick={close} className="flex items-center gap-3 px-4 py-2 hover:bg-hover">
              <Avatar name={u.username} src={u.avatarUrl} size={28} />
              <div className="text-sm font-medium">u/{u.username}</div>
            </Link>
          ))}
          {!hasResults && !communities.isFetching && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Snoo size={20} /> No results for "{q}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}