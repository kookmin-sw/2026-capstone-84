import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavigationBar from './components/layout/NavigationBar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import CreateGroupPage from './pages/CreateGroupPage';
import GroupDetailPage from './pages/GroupDetailPage';
import MemosPage from './pages/MemosPage';
import DiscussionsPage from './pages/DiscussionsPage';
import DiscussionThreadPage from './pages/DiscussionThreadPage';
import MyPage from './pages/MyPage';
import ReadingDetailPage from './pages/ReadingDetailPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import InvitePage from './pages/InvitePage';
import { useAuthStore } from './stores/authStore';
import { mypageApi } from './api/mypage';

// Lazy-loaded community pages
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const CommunityWritePage = lazy(() => import('./pages/CommunityWritePage'));
const CommunityPostPage = lazy(() => import('./pages/CommunityPostPage'));

function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // 토큰은 있는데 user 정보가 없으면 프로필 가져오기
  useEffect(() => {
    if (accessToken && !user) {
      mypageApi.getProfile()
        .then((res) => setUser(res.data))
        .catch(() => {
          // 프로필 조회 실패 시 (토큰 만료/서버 에러) 로그아웃 처리
          useAuthStore.getState().logout();
        });
    }
  }, [accessToken]);

  return (
    <>
      <NavigationBar />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>불러오는 중...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<HomePage />} />

          {/* Community routes (new) */}
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/write" element={<CommunityWritePage />} />
          <Route path="/community/:postId" element={<CommunityPostPage />} />

          {/* Existing group/discussion routes */}
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/groups/:id/memos" element={<MemosPage />} />
          <Route path="/groups/:id/discussions" element={<DiscussionsPage />} />
          <Route path="/discussions/:id" element={<DiscussionThreadPage />} />
          <Route path="/groups/:id/dashboard" element={<DashboardPage />} />
          <Route path="/invite/:code" element={<InvitePage />} />

          {/* User pages */}
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/reading/:id" element={<ReadingDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
