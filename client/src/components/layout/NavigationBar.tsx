import { NavLink, Link, useLocation } from 'react-router-dom';
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
  },
  menuItemActive: {
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 600,
    color: '#667eea',
    textDecoration: 'none',
    borderRadius: 6,
    backgroundColor: '#ebf4ff',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  notificationBadge: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 18,
  },
  badgeCount: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: '#e53e3e',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
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
};

interface NavItem {
  label: string;
  path: string;
}

const menuItems: NavItem[] = [
  { label: '홈', path: '/' },
  { label: '커뮤니티', path: '/community' },
  { label: '토론', path: '/groups' },
  { label: '마이페이지', path: '/mypage' },
];

function NavigationBar() {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isLoggedIn = !!accessToken;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Filter menu items: show 마이페이지 only for logged-in users
  const visibleMenuItems = isLoggedIn
    ? menuItems
    : menuItems.filter((item) => item.path !== '/mypage');

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          📚 북커뮤니티
        </Link>

        <ul style={styles.menuList}>
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                style={isActive(item.path) ? styles.menuItemActive : styles.menuItem}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div style={styles.rightSection}>
          {/* Notification badge */}
          {isLoggedIn && <NotificationBadge />}

          {!isLoggedIn && (
            <Link to="/login" style={styles.loginButton}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavigationBar;
