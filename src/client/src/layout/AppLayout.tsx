import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const publicNav = [
  { to: '/projects', label: 'ПОРТФОЛИО' },
  { to: '/#about', label: 'ОБО МНЕ' },
  { to: '/#process', label: 'ПРОЦЕСС' },
  { to: '/contacts', label: 'КОНТАКТЫ' },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="app-shell">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="wordmark header-wordmark" to="/">
          CHRONO—ART
        </NavLink>

        <nav className="site-nav" aria-label="Основная навигация">
          {publicNav.map((item) => (
            <NavLink key={item.to} className="nav-link" to={item.to}>
              {item.label}
              {item.to === '/contacts' ? '' : ','}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {!loading && user ? (
            <>
              <NavLink className="nav-link" to={user.role === 'admin' ? '/admin/orders' : '/my-orders'}>
                {user.role === 'admin' ? 'АДМИНКА' : 'МОИ ЗАКАЗЫ'}
              </NavLink>
              <button className="nav-button" type="button" onClick={handleLogout}>
                ВЫЙТИ
              </button>
            </>
          ) : (
            <NavLink end className="nav-link" to="/auth">
              ВОЙТИ
            </NavLink>
          )}
          <NavLink className="header-cta" to="/#wizard">
            ЗАКАЗАТЬ ЧАСЫ
          </NavLink>
        </div>

        <button
          className="header-burger"
          type="button"
          aria-label="Открыть меню"
          onClick={() => setMenuOpen(true)}
        >
          &#9776;
        </button>
      </header>

      {/* Mobile nav overlay */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Меню">
        <div className="mobile-nav-header">
          <NavLink className="wordmark header-wordmark" to="/" onClick={closeMenu}
            style={{ padding: '0', height: 'auto', minWidth: 0 }}>
            CHRONO—ART
          </NavLink>
          <button className="mobile-nav-close" type="button" aria-label="Закрыть меню" onClick={closeMenu}>
            &times;
          </button>
        </div>
        <nav className="mobile-nav-links" aria-label="Мобильная навигация">
          {publicNav.map((item) => (
            <NavLink key={item.to} className="mobile-nav-link" to={item.to} onClick={closeMenu}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mobile-nav-actions">
          {!loading && user ? (
            <>
              <NavLink
                className="mobile-nav-link"
                to={user.role === 'admin' ? '/admin/orders' : '/my-orders'}
                onClick={closeMenu}
              >
                {user.role === 'admin' ? 'АДМИНКА' : 'МОИ ЗАКАЗЫ'}
              </NavLink>
              <button
                className="mobile-nav-link"
                type="button"
                onClick={() => { closeMenu(); void handleLogout(); }}
              >
                ВЫЙТИ
              </button>
            </>
          ) : (
            <NavLink className="mobile-nav-link" to="/auth" onClick={closeMenu}>
              ВОЙТИ
            </NavLink>
          )}
          <NavLink className="mobile-nav-cta" to="/#wizard" onClick={closeMenu}>
            ЗАКАЗАТЬ ЧАСЫ
          </NavLink>
        </div>
      </div>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-nav-group">
            <div className="footer-col">
              <p className="footer-label">Навигация</p>
              <NavLink to="/projects">Портфолио</NavLink>
              <NavLink to="/#about">Обо мне</NavLink>
              <NavLink to="/#process">Процесс</NavLink>
              <NavLink to="/contacts">Контакты</NavLink>
            </div>
            <div className="footer-col">
              <p className="footer-label">Контакты</p>
              <a href="tel:+79990000000">+7 999 000 00 00</a>
              <a href="mailto:master@chronoart.ru">master@chronoart.ru</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-wordmark">CHRONO—ART</div>
          <p className="copyright">© 2026 ChronoArt. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
