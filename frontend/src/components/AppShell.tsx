import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getInitials(name: string): string {
  const chunks = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (chunks.length === 0) {
    return 'NA';
  }

  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? '').join('');
}

export function AppShell() {
  const { user, logout, isManager } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand-block">
          <p>Leave Management System</p>
          <h1>Employee Portal</h1>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          <NavLink
            to="/leave"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            My Leave
          </NavLink>
          {isManager ? (
            <NavLink
              to="/manager"
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              Manager Dashboard
            </NavLink>
          ) : null}
        </nav>

        <div className="user-menu">
          <div className="user-avatar" aria-hidden="true">
            {getInitials(user?.name ?? '')}
          </div>
          <div className="user-meta">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
