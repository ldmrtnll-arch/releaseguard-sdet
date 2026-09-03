import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();

  function signOut() {
    auth.logout();
    void navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="ReleaseGuard home">
          <span className="brand-mark" aria-hidden="true">
            RG
          </span>
          ReleaseGuard
        </Link>

        <nav aria-label="Primary navigation">
          <NavLink to="/plans">Plans</NavLink>
          {auth.status === 'authenticated' ? (
            <>
              <NavLink to="/subscription">Subscription</NavLink>
              <span className="user-name">Signed in as {auth.user?.name}</span>
              <button className="button button--quiet" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <Link className="button button--small" to="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <p>ReleaseGuard · Phase 7 Advanced Quality</p>
      </footer>
    </div>
  );
}
