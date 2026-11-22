import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
};

// Drafts live in this browser (localStorage), one list per account.
export const useDrafts = () => {
  const { user } = useAuth();
  const key = `drafts_${user?.id}`;
  const [drafts, setDrafts] = useState(() => read(key));

  const persist = (next) => {
    setDrafts(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return {
    drafts,
    // Saving a draft that already has an id updates it instead of adding a copy.
    save: (draft) => {
      const id = draft.id ?? crypto.randomUUID();
      persist([{ ...draft, id, savedAt: new Date().toISOString() }, ...drafts.filter((d) => d.id !== id)]);
      return id;
    },
    remove: (id) => persist(drafts.filter((d) => d.id !== id)),
  };
};