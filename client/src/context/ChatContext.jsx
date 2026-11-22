import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../api/client';
import { appendMessage } from '../api/chatCache';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, openAuth } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('empty'); // 'empty' (thread list only) | 'create' | 'chat'
  const [chatId, setChatId] = useState(null);

  const chats = useQuery({
    queryKey: ['chats'],
    queryFn: async () => (await api.get('/chats')).data.items,
    enabled: Boolean(user),
  });
  const unreadTotal = (chats.data ?? []).reduce((sum, chat) => sum + chat.unreadCount, 0);

  // One WebSocket per logged-in user. The server pushes new messages; everything else is plain REST.
  useEffect(() => {
    if (!user) {
      setOpen(false);
      return undefined;
    }

    let socket;
    let timer;
    let attempts = 0;
    let wasConnected = false;
    let stopped = false;

    const connect = () => {
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${scheme}://${window.location.host}/ws`);

      socket.onopen = () => {
        attempts = 0;
        // After a reconnect we may have missed messages, so refetch instead of trusting the cache.
        if (wasConnected) {
          queryClient.invalidateQueries({ queryKey: ['chats'] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        }
        wasConnected = true;
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type !== 'chat.message') return;
        appendMessage(queryClient, data.message);
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      };

      // Reconnect with exponential backoff: 1s, 2s, 4s ... capped at 15s.
      socket.onclose = () => {
        if (!stopped) timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15_000));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.close();
    };
  }, [user?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPanel = () => {
    if (!user) {
      openAuth('login');
      return false;
    }
    setOpen(true);
    return true;
  };

  const value = {
    open,
    mode,
    chatId,
    chats,
    unreadTotal,
    togglePanel: () => (open ? setOpen(false) : openPanel()),
    closePanel: () => setOpen(false),
    startNewChat: () => openPanel() && setMode('create'),
    showList: () => {
      setMode('empty');
      setChatId(null);
    },
    openThread: (id) => {
      setChatId(id);
      setMode('chat');
      setOpen(true);
    },
    // Used by "Message" buttons: open (or create) the chat with one user and show it.
    messageUser: async (username) => {
      if (!openPanel()) return;
      try {
        const { data } = await api.post('/chats', { usernames: [username] });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        setChatId(data.chat.id);
        setMode('chat');
      } catch (err) {
        toast(getErrorMessage(err), 'error');
      }
    },
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);