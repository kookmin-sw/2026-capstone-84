import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import CreateGroupPage from './pages/CreateGroupPage';
import GroupDetailPage from './pages/GroupDetailPage';
import MemosPage from './pages/MemosPage';
import DiscussionsPage from './pages/DiscussionsPage';
import DiscussionThreadPage from './pages/DiscussionThreadPage';
import MyPage from './pages/MyPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import InvitePage from './pages/InvitePage';
import ProposalThreadPage from './pages/ProposalThreadPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/groups/new" element={<CreateGroupPage />} />
      <Route path="/groups/:id" element={<GroupDetailPage />} />
      <Route path="/groups/:id/memos" element={<MemosPage />} />
      <Route path="/groups/:id/discussions" element={<DiscussionsPage />} />
      <Route path="/discussions/:id" element={<DiscussionThreadPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/groups/:id/dashboard" element={<DashboardPage />} />
      <Route path="/invite/:code" element={<InvitePage />} />
      <Route path="/proposals/:id" element={<ProposalThreadPage />} />
    </Routes>
  );
}

export default App;
