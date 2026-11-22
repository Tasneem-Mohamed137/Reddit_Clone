import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu, MessageCircle, Moon, Plus, Settings, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import SearchBar from '../search/SearchBar';
import Avatar from '../ui/Avatar';
import { Logo } from '../ui/Logo';

const menuItem = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-hover';

function UserMenu({ user }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useClickOutside(ref, () => setOpen(false));

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast('Logged out');
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="rounded-full p-1 hover:bg-hover" aria-label="User menu">
        <Avatar name={user.username} src={user.avatarUrl} size={32} online />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl">
          <Link to={`/user/${user.username}`} onClick={() => setOpen(false)} className={menuItem}>
            <Avatar name={user.username} src={user.avatarUrl} size={32} online />
            <span>
              <span className="block font-medium">View Profile</span>
              <span className="block text-xs text-muted">u/{user.username}</span>
            </span>
          </Link>
          <button onClick={toggleTheme} className={menuItem}>
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="flex-1">Dark Mode</span>
            <span className={`h-5 w-9 rounded-full p-0.5 ${theme === 'dark' ? 'bg-btn' : 'bg-input'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform duration-150 ${theme === 'dark' ? 'translate-x-4' : ''}`} />
            </span>
          </button>
          <Link to="/settings/profile" onClick={() => setOpen(false)} className={menuItem}>
            <Settings size={20} /> Settings
          </Link>
          <button onClick={handleLogout} className={menuItem}>
            <LogOut size={20} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onToggleSidebar }) {
  const { user, isLoading, openAuth, guardLink } = useAuth();
  const { togglePanel, unreadTotal } = useChat();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-app px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <button onClick={onToggleSidebar} className="flex h-10 w-10 items-center justify-center rounded-full bg-input hover:bg-hover lg:hidden">
          <Menu size={20} />
        </button>
        <Link to="/" aria-label="Reddit home">
          <Logo />
        </Link>
      </div>

      <div className="flex flex-1 justify-center">
        <SearchBar />
      </div>

      <div className="flex items-center gap-1">
        <button onClick={togglePanel} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-hover" aria-label="Chats">
          <MessageCircle size={20} />
          {unreadTotal > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 text-white">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
        <Link to="/submit" onClick={guardLink} className="flex h-10 items-center gap-1.5 rounded-full px-3 hover:bg-hover" aria-label="Create post">
          <Plus size={22} />
          <span className="hidden text-sm font-medium md:inline">Create</span>
        </Link>
        <button onClick={() => toast('Notifications are coming soon')} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-hover" aria-label="Notifications">
          <Bell size={20} />
        </button>

        {isLoading ? (
          <div className="skeleton h-8 w-8 rounded-full" />
        ) : user ? (
          <UserMenu user={user} />
        ) : (
          <>
            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-hover" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => openAuth('login')} className="h-10 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:opacity-90">
              Log In
            </button>
          </>
        )}
      </div>
    </header>
  );
}