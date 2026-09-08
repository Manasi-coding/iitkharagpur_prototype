import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FooterCard from '../components/Footer';

export default function LoginPage({ user, onLogin, onLogout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    
    // Mock login success
    onLogin({ email, name: email.split('@')[0] });
    navigate('/demo');
  };

  return (
    <div className="auth-page-wrapper">
      <Navbar user={user} onLogout={onLogout} />

      <main className="auth-container">
        <div className="auth-card">
          <h2>Log In to Hebbian Lab</h2>
          <p className="auth-subtitle">Access your simulation workbench</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="form-group">
              <span>Email Address</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="form-group">
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="auth-submit-btn">Log In →</button>
          </form>

          <div className="auth-footer">
            <span>Don't have an account? <Link to="/signup">Sign Up</Link></span>
            <Link to="/" className="back-link">← Back to Landing Page</Link>
          </div>
        </div>
      </main>

      <FooterCard />
    </div>
  );
}
