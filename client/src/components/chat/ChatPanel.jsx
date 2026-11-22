import { MessageSquarePlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Snoo } from '../ui/Logo';
import ChatWindow from './ChatWindow';
import CreateChat from './CreateChat';
import ThreadList from './ThreadList';

export default function ChatPanel() {
  const { user } = useAuth();
  const { open, mode, chatId, chats, closePanel, startNewChat, openThread, showList } = useChat();
  if (!open || !user) return null;

  const active = chats.data?.find((c) => c.id === chatId);
  // On phones the panel shows ONE pane at a time: the list, or the selected right-hand view.
  const showRight = mode !== 'empty';

  return (
    <div className="fixed bottom-0 right-0 z-[80] flex h-dvh w-full overflow-hidden border border-line bg-card shadow-2xl sm:bottom-4 sm:right-4 sm:h-[560px] sm:w-[760px] sm:rounded-2xl">
      <section className={`${showRight ? 'hidden' : 'flex'} w-full flex-col border-r border-line sm:flex sm:w-[260px] sm:shrink-0`}>
        <header className="flex items-center gap-2 p-4">
          <Snoo size={28} />
          <h1 className="flex-1 text-lg font-bold">Chats</h1>
          <button onClick={startNewChat} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-hover" aria-label="New chat">
            <MessageSquarePlus size={20} />
          </button>
          <button onClick={closePanel} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-hover" aria-label="Close chats">
            <X size={20} />
          </button>
        </header>
        <ThreadList query={chats} activeId={chatId} onSelect={openThread} />
      </section>

      <section className={`${showRight ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col sm:flex`}>
        {mode === 'create' && (
          <>
            <header className="border-b border-line px-4 py-3 text-sm font-semibold">Create Chat</header>
            <div className="min-h-0 flex-1">
              <CreateChat onCancel={showList} />
            </div>
          </>
        )}
        {mode === 'chat' && (active ? <ChatWindow key={active.id} chat={active} /> : <div className="skeleton m-4 h-24" />)}
        {mode === 'empty' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-muted">Select a chat or start a new one.</p>
            <button onClick={startNewChat} className="rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              New chat
            </button>
          </div>
        )}
      </section>
    </div>
  );
}