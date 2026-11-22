import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { api, getErrorMessage } from '../../api/client';
import { appendMessage } from '../../api/chatCache';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { chatTitle, otherParticipants } from '../../utils/chat';
import { timeAgo } from '../../utils/format';
import Avatar from '../ui/Avatar';

export default function ChatWindow({ chat }) {
  const { user } = useAuth();
  const { showList } = useChat();
  const queryClient = useQueryClient();
  const toast = useToast();
  const scroller = useRef(null);
  const [draft, setDraft] = useState('');

  // Page 1 = newest messages; "Load earlier messages" fetches older pages with the nextBefore cursor.
  const messages = useInfiniteQuery({
    queryKey: ['chat-messages', chat.id],
    initialPageParam: null,
    queryFn: async ({ pageParam }) =>
      (await api.get(`/chats/${chat.id}/messages`, { params: { before: pageParam ?? undefined, limit: 30 } })).data,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
  const list = messages.data ? [...messages.data.pages].reverse().flatMap((page) => page.items) : [];
  const lastId = list.at(-1)?.id;
  const hasUnread = chat.unreadCount > 0;
  const people = new Map(chat.participants.map((p) => [p.id, p]));

  // Opening the chat (or receiving a message while it is open) marks it as read.
  useEffect(() => {
    if (!hasUnread) return;
    api.post(`/chats/${chat.id}/read`).then(() => queryClient.invalidateQueries({ queryKey: ['chats'] }));
  }, [chat.id, hasUnread, lastId, queryClient]);

  // Stay at the bottom when a new message arrives (older pages are prepended, so lastId does not change).
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [chat.id, lastId]);

  const send = useMutation({
    mutationFn: async (body) => (await api.post(`/chats/${chat.id}/messages`, { body })).data.message,
    onSuccess: (message) => {
      appendMessage(queryClient, message);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    send.mutate(body, {
      onError: (err) => {
        setDraft(body); // give the text back so nothing is lost
        toast(getErrorMessage(err), 'error');
      },
    });
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const first = otherParticipants(chat, user)[0];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={showList} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-hover sm:hidden" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <Avatar name={first?.username ?? '?'} src={first?.avatarUrl} size={32} />
        <h2 className="truncate text-sm font-semibold">{chatTitle(chat, user)}</h2>
      </header>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.hasNextPage && (
          <button onClick={() => messages.fetchNextPage()} disabled={messages.isFetchingNextPage} className="mx-auto block text-xs font-medium text-link hover:underline">
            {messages.isFetchingNextPage ? 'Loading...' : 'Load earlier messages'}
          </button>
        )}
        {messages.isLoading && <div className="skeleton h-12" />}
        {messages.data && list.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hi 👋</p>}

        {list.map((m, i) => {
          const mine = m.senderId === user.id;
          const showName = chat.isGroup && !mine && list[i - 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {showName && <span className="mb-0.5 px-2 text-xs text-muted">u/{people.get(m.senderId)?.username ?? 'unknown'}</span>}
              <div className={`rtl-aware max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] ${mine ? 'bg-btn text-white' : 'bg-input'}`}>
                {m.body}
              </div>
              <span className="px-2 text-[10px] text-muted">{timeAgo(m.createdAt)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="Message"
          className="rtl-aware max-h-28 min-h-10 flex-1 resize-none rounded-3xl bg-input px-4 py-2.5 text-sm outline-none placeholder:text-muted"
        />
        <button onClick={submit} disabled={!draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-btn text-white hover:opacity-90 disabled:opacity-40" aria-label="Send">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}