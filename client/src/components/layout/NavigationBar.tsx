import { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import NotificationBadge from './NotificationBadge';

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  inner: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  logo: {
    fontSize: 18,
    fontWeight: 800,
    color: '#1a202c',
    textDecoration: 'none',
    letterSpacing: '-0.5px',
  },
  menuList: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  menuItem: {
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 500,
    color: '#718096',
    textDecoration: 'none',
    borderRadius: 6,
    transition: 'color 0.15s, background-color 0.15s',
    cursor: 'pointer',
  },
  menuItemActive: {
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 600,
    color: '#667eea',
    textDecoration: 'none',
    borderRadius: 6,
    backgroundColor: '#ebf4ff',
    cursor: 'pointer',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  loginButton: {
    padding: '7px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
  logoutButton: {
    padding: '7px 16px',
    backgroundColor: '#fff',
    color: '#e53e3e',
    border: '1px solid #fed7d7',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Modal styles
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '32px 28px',
    width: '90%',
    maxWidth: 360,
    textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  modalLoginBtn: {
    display: 'inline-block',
    padding: '10px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  modalCloseBtn: {
    display: 'inline-block',
    padding: '10px 28px',
    backgroundColor: '#f7fafc',
    color: '#718096',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    marginLeft: 10,
  },
};

interface NavItem {
  label: string;
  path: string;
  requiresAuth?: boolean;
}

const menuItems: NavItem[] = [
  { label: '홈', path: '/' },
  { label: '커뮤니티', path: '/community' },
  { label: '토론', path: '/groups' },
  { label: '마이페이지', path: '/mypage', requiresAuth: true },
];

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isLoggedIn = !!accessToken;
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleMenuClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.requiresAuth && !isLoggedIn) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.inner}>
          <Link to="/" style={styles.logo}>
            📚 북커뮤니티
          </Link>

          <ul style={styles.menuList}>
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.requiresAuth && !isLoggedIn ? '#' : item.path}
                  style={isActive(item.path) ? styles.menuItemActive : styles.menuItem}
                  onClick={(e) => handleMenuClick(item, e)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div style={styles.rightSection}>
            {isLoggedIn && <NotificationBadge />}
            {isLoggedIn && (
              <button
                onClick={() => { useAuthStore.getState().logout(); navigate('/'); }}
                style={styles.logoutButton}
              >
                로그아웃
              </button>
            )}
            {!isLoggedIn && (
              <Link to="/login" style={styles.loginButton}>
                로그인
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 로그인 필요 모달 */}
      {showLoginModal && (
        <div style={styles.overlay} onClick={() => setShowLoginModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={styles.modalTitle}>로그인이 필요합니다</div>
            <div style={styles.modalMessage}>
              마이페이지를 이용하려면 로그인해주세요.
            </div>
            <div>
              <button
                style={styles.modalLoginBtn}
                onClick={() => { setShowLoginModal(false); navigate('/login'); }}
              >
                로그인
              </button>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setShowLoginModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NavigationBar;
