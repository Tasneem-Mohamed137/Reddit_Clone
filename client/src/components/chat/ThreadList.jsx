import { useAuth } from '../../context/AuthContext';
import { chatTitle, otherParticipants } from '../../utils/chat';
import { timeAgo } from '../../utils/format';
import Avatar from '../ui/Avatar';

export default function ThreadList({ query, activeId, onSelect }) {
  const { user } = useAuth();

  if (query.isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-14" />
        ))}
      </div>
    );
  }

  if (!query.data?.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted">No chats yet. Start one with the + button.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-2">
      {query.data.map((chat) => {
        const first = otherParticipants(chat, user)[0];
        const preview = chat.lastMessage
          ? `${chat.lastMessage.senderId === user.id ? 'You: ' : ''}${chat.lastMessage.body}`
          : 'No messages yet';
        return (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-hover ${activeId === chat.id ? 'bg-hover' : ''}`}
          >
            <Avatar name={first?.username ?? '?'} src={first?.avatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm ${chat.unreadCount ? 'font-semibold' : 'font-medium'}`}>{chatTitle(chat, user)}</span>
                <span className="shrink-0 text-[10px] text-muted">{timeAgo(chat.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="rtl-aware truncate text-xs text-muted">{preview}</span>
                {chat.unreadCount > 0 && (
                  <span className="min-w-5 shrink-0 rounded-full bg-brand px-1.5 text-center text-[10px] font-bold text-white">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}