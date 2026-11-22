import { Route, Routes } from 'react-router-dom';
import AuthModal from './components/auth/AuthModal';
import ChatPanel from './components/chat/ChatPanel';
import AppLayout from './components/layout/AppLayout';
import CommunityPage from './pages/CommunityPage';
import CreateCommunityPage from './pages/CreateCommunityPage';
import EditCommunityPage from './pages/EditCommunityPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import NotificationsPage from './pages/NotificationsPage';
import PeoplePage from './pages/PeoplePage';
import PopularPage from './pages/PopularPage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import SubmitPage from './pages/SubmitPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="popular" element={<PopularPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="r/:name" element={<CommunityPage />} />
          <Route path="r/:name/edit" element={<EditCommunityPage />} />
          <Route path="r/:name/comments/:postId/:slug?" element={<PostPage />} />
          <Route path="user/:username" element={<ProfilePage />} />
          <Route path="submit" element={<SubmitPage />} />
          <Route path="communities/create" element={<CreateCommunityPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings/profile" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <AuthModal />
      <ChatPanel />
    </>
  );
}