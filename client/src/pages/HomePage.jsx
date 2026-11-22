import { useState } from 'react';
import FeedControls from '../components/feed/FeedControls';
import PostList from '../components/feed/PostList';
import { useAuth } from '../context/AuthContext';
import { useFeedControls } from '../hooks/useFeedControls';

const TABS = [
  { id: 'foryou', label: 'For You', path: '/posts' },
  { id: 'following', label: 'Following', path: '/feed' },
];

export default function HomePage() {
  const { user, openAuth } = useAuth();
  const [tab, setTab] = useState('foryou');
  const controls = useFeedControls();
  const active = TABS.find((t) => t.id === tab);

  return (
    <>
      <div className="mb-1 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-9 rounded-full px-4 text-sm font-medium ${tab === t.id ? 'bg-hover' : 'text-muted hover:bg-hover'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <FeedControls controls={controls} />

      {tab === 'following' && !user ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted">Log in to see posts from the communities you joined.</p>
          <button onClick={() => openAuth('login')} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Log In
          </button>
        </div>
      ) : (
        <PostList key={tab} path={active.path} controls={controls} empty="Nothing here yet. Join some communities!" />
      )}
    </>
  );
}