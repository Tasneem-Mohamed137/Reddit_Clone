import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postPath } from '../utils/format';
import { useVote } from './useVote';

// Reddit's feed keys:  j = next post, k = previous, a = upvote, z = downvote, o / Enter = open.
// Returns the id of the highlighted post.
export const useFeedShortcuts = (posts) => {
  const navigate = useNavigate();
  const vote = useVote();
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      const typing = target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

      const index = posts.findIndex((p) => p.id === activeId);
      const current = posts[index];
      const move = (next) => {
        const post = posts[Math.min(Math.max(next, 0), posts.length - 1)];
        if (!post) return;
        setActiveId(post.id);
        document.getElementById(`post-${post.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };

      if (event.key === 'j') move(index + 1);
      else if (event.key === 'k') move(index === -1 ? 0 : index - 1);
      else if (current && event.key === 'o') navigate(postPath(current));
      else if (current && event.key === 'Enter' && target === document.body) navigate(postPath(current));
      else if (current && event.key === 'a') vote(current.id, current.userVote === 1 ? 0 : 1);
      else if (current && event.key === 'z') vote(current.id, current.userVote === -1 ? 0 : -1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [posts, activeId, navigate, vote]);

  return activeId;
};