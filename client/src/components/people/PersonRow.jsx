import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../ui/Avatar';
import FollowButton from './FollowButton';

const reasonOf = (person) => {
  if (person.mutualFollows > 0) return `${person.mutualFollows} mutual follow${person.mutualFollows > 1 ? 's' : ''}`;
  if (person.sharedCommunities > 0) {
    return `${person.sharedCommunities} shared communit${person.sharedCommunities > 1 ? 'ies' : 'y'}`;
  }
  return null;
};

export default function PersonRow({ person, compact = false }) {
  const { user } = useAuth();
  const { messageUser } = useChat();
  const isMe = user?.username === person.username;

  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-hover">
      <Link to={`/user/${person.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.username} src={person.avatarUrl} size={compact ? 32 : 40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">u/{person.username}</div>
          {(reasonOf(person) ?? person.bio) && (
            <div className="rtl-aware truncate text-xs text-muted">{reasonOf(person) ?? person.bio}</div>
          )}
        </div>
      </Link>
      {!compact && !isMe && (
        <button
          onClick={() => messageUser(person.username)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line hover:bg-hover"
          aria-label={`Message u/${person.username}`}
        >
          <MessageCircle size={16} />
        </button>
      )}
      <FollowButton username={person.username} />
    </div>
  );
}