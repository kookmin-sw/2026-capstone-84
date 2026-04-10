import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserNamePrompt from './components/UserNamePrompt';
import RoomListPage from './pages/RoomListPage';
import ChatRoomPage from './pages/ChatRoomPage';

export default function App() {
  const auth = useAuth();
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 인증 상태 변경 시 적절한 경로로 리다이렉트
  useEffect(() => {
    if (auth.isAuthenticated || auth.isGuest) {
      // 로그인/회원가입 페이지에 있으면 홈으로
      if (location.pathname === '/register' || location.pathname === '/login') {
        navigate('/', { replace: true });
      }
    } else {
      // 로그아웃 상태면 홈으로 (로그인 페이지 표시)
      if (location.pathname !== '/' && location.pathname !== '/register') {
        navigate('/', { replace: true });
      }
    }
  }, [auth.isAuthenticated, auth.isGuest]);

  // Not logged in and not a guest
  if (!auth.isAuthenticated && !auth.isGuest) {
    if (showGuestPrompt) {
      return <UserNamePrompt onSubmit={(name) => auth.loginAsGuest(name)} onBack={() => setShowGuestPrompt(false)} />;
    }
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage onRegister={auth.register} />} />
        <Route path="*" element={
          <LoginPage
            onLogin={auth.login}
            onGuestClick={() => {
              const existingName = localStorage.getItem('chat_userName');
              if (existingName) {
                auth.loginAsGuest(existingName);
              } else {
                setShowGuestPrompt(true);
              }
            }}
          />
        } />
      </Routes>
    );
  }

  // Logged in or guest - show main app
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '8px 16px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <span style={{ marginRight: '12px', fontSize: '0.9rem', color: '#666' }}>
          {auth.userName}{auth.role === 'admin' ? ' (관리자)' : auth.isGuest ? ' (게스트)' : ''}
        </span>
        {auth.isGuest ? (
          <button
            onClick={auth.logout}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #4a90d9', backgroundColor: '#4a90d9', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            로그인
          </button>
        ) : (
          <button
            onClick={auth.logout}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            로그아웃
          </button>
        )}
      </header>
      <Routes>
        <Route path="/" element={<RoomListPage userId={auth.userId} userName={auth.userName} role={auth.role} />} />
        <Route path="/rooms/:roomId" element={<ChatRoomPage userId={auth.userId} userName={auth.userName} />} />
      </Routes>
    </div>
  );
}
