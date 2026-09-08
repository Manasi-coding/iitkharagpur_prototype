import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="landing-navbar">
      <div className="nav-container">
        <Link to="/" className="brand-logo">
          <span className="brand-icon">∿</span>
          <span className="brand-name">Hebbian Synapse Lab</span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-welcome">Hello, <b>{user.name || user.email}</b></span>
              <button 
                onClick={() => navigate('/demo')} 
                className="btn-demo"
              >
                Launch Demo
              </button>
              <button 
                onClick={onLogout} 
                className="btn-logout"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Log In</Link>
              <Link to="/signup" className="nav-link btn-signup">Sign Up</Link>
              <Link to="/demo" className="btn-demo">Try the Demo</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
