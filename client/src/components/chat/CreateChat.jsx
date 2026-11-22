import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import Avatar from '../ui/Avatar';

const MAX_PEOPLE = 7;

export default function CreateChat({ onCancel }) {
  const { user } = useAuth();
  const { openThread } = useChat();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]);
  const q = useDebounce(text.trim().replace(/^u\//i, ''), 250);

  const results = useQuery({
    queryKey: ['search', 'users', q, 'chat'],
    queryFn: async () => (await api.get('/search', { params: { q, type: 'users', limit: 6 } })).data.items,
    enabled: q.length > 0,
  });
  const options = (results.data ?? []).filter(
    (u) => u.username !== user.username && !picked.some((p) => p.username === u.username),
  );

  const pick = (person) => {
    setPicked((list) => (list.length >= MAX_PEOPLE ? list : [...list, person]));
    setText('');
  };

  const create = useMutation({
    mutationFn: async () => (await api.post('/chats', { usernames: picked.map((p) => p.username) })).data.chat,
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      openThread(chat.id);
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-input px-4 py-3">
          {picked.map((p) => (
            <span key={p.username} className="flex items-center gap-1 rounded-full bg-btn px-2.5 py-1 text-xs font-medium text-white">
              u/{p.username}
              <button onClick={() => setPicked((list) => list.filter((x) => x.username !== p.username))} aria-label={`Remove ${p.username}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && options[0] && pick(options[0])}
            placeholder={picked.length ? 'Add another...' : 'Type username(s)'}
            autoFocus
            className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <p className="mt-2 px-2 text-xs text-muted">Search for people by username to chat with them. Pick several for a group chat.</p>

        {q && (
          <div className="mt-3">
            {options.map((u) => (
              <button key={u.id} onClick={() => pick(u)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-hover">
                <Avatar name={u.username} src={u.avatarUrl} size={32} />
                <span className="text-sm font-medium">u/{u.username}</span>
              </button>
            ))}
            {!results.isFetching && options.length === 0 && <p className="px-3 py-2 text-sm text-muted">No people found</p>}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line p-3">
        <button onClick={onCancel} className="h-9 rounded-full bg-input px-4 text-sm font-semibold hover:bg-hover">
          Cancel
        </button>
        <button
          onClick={() => create.mutate()}
          disabled={picked.length === 0 || create.isPending}
          className="h-9 rounded-full bg-btn px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {create.isPending ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  );
}