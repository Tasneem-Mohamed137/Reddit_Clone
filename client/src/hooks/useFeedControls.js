import { useState } from 'react';

export const useFeedControls = (defaultSort = 'best') => {
  const [sort, setSort] = useState(defaultSort);
  const [range, setRange] = useState('all');
  const [view, setViewState] = useState(() => localStorage.getItem('feed_view') ?? 'card');

  const setView = (next) => {
    setViewState(next);
    localStorage.setItem('feed_view', next);
  };

  return { sort, setSort, range, setRange, view, setView };
};