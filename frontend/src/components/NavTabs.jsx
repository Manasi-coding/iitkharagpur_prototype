import { Link, useLocation } from 'react-router-dom';

/**
 * NavTabs — minimal two-tab navigation between Memory Lab and Attractor Dynamics.
 * Renders at the top of both demo-shell pages.
 * Does not modify any session state.
 */
export default function NavTabs() {
  const { pathname } = useLocation();

  return (
    <nav className="nav-tabs" aria-label="Demo navigation">
      <Link
        to="/demo"
        className={`nav-tab ${pathname === '/demo' ? 'nav-tab--active' : ''}`}
        aria-current={pathname === '/demo' ? 'page' : undefined}
      >
        <span className="nav-tab-icon">⬡</span>
        Memory Lab
      </Link>
      <Link
        to="/attractor"
        className={`nav-tab ${pathname === '/attractor' ? 'nav-tab--active' : ''}`}
        aria-current={pathname === '/attractor' ? 'page' : undefined}
      >
        <span className="nav-tab-icon">◎</span>
        Attractor Dynamics
      </Link>
    </nav>
  );
}
