import { useEffect, useState } from 'react';

const KEY = 'recent_communities';
const EVENT = 'recent-communities-changed';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
};

// Called by the community page (next batch) every time a community is opened.
export const addRecentCommunity = (community) => {
  const next = [community, ...read().filter((c) => c.name !== community.name)].slice(0, 5);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
};

export const useRecentCommunities = () => {
  const [items, setItems] = useState(read);
  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return items;
};