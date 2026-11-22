import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { useVote } from '../../hooks/useVote';
import { formatCount } from '../../utils/format';

export default function VotePill({ post }) {
  const vote = useVote();
  const up = post.userVote === 1;
  const down = post.userVote === -1;
  // Clicking the active arrow again removes the vote (value 0).
  const click = (value) => vote(post.id, post.userVote === value ? 0 : value);

  const tone = up ? 'bg-brand text-white' : down ? 'bg-down text-white' : 'bg-input';
  const arrow = 'flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/20';

  return (
    <div className={`flex h-8 items-center rounded-full ${tone}`}>
      <button onClick={() => click(1)} className={arrow} aria-label="Upvote">
        <ArrowBigUp size={20} fill={up ? 'currentColor' : 'none'} />
      </button>
      <span className="min-w-5 text-center text-xs font-semibold">{formatCount(post.score)}</span>
      <button onClick={() => click(-1)} className={arrow} aria-label="Downvote">
        <ArrowBigDown size={20} fill={down ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}