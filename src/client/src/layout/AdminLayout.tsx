import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${navOpen ? ' nav-open' : ''}`} aria-label="Административная навигация">
        <div className="admin-brand">
          <NavLink to="/" className="admin-wordmark">
            CHRONO—ART
          </NavLink>
          <p>—АДМИН</p>
          <button
            className="admin-sidebar-toggle"
            type="button"
            aria-label={navOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? '×' : '≡'}
          </button>
        </div>

        <nav className="admin-nav">
          <NavLink
            to="/admin/orders"
            className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}
            onClick={() => setNavOpen(false)}
          >
            ЗАКАЗЫ
          </NavLink>
          <NavLink
            to="/admin/projects"
            className={({ isActive }) => (isActive ? 'admin-nav-link active' : 'admin-nav-link')}
            onClick={() => setNavOpen(false)}
          >
            ПОРТФОЛИО
          </NavLink>
          <button className="admin-nav-link" type="button" onClick={handleLogout}>
            ВЫЙТИ
          </button>
        </nav>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}
