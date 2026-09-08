import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FooterCard from '../components/Footer';

export default function SignupPage({ user, onLogin, onLogout }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Mock signup success
    onLogin({ name, email });
    navigate('/demo');
  };

  return (
    <div className="auth-page-wrapper">
      <Navbar user={user} onLogout={onLogout} />

      <main className="auth-container">
        <div className="auth-card">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Get started with Hebbian Synapse Lab</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="form-group">
              <span>Full Name</span>
              <input
                type="text"
                placeholder="Dr. Alex Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="auth-submit-btn">Sign Up & Launch →</button>
          </form>

          <div className="auth-footer">
            <span>Already have an account? <Link to="/login">Log In</Link></span>
            <Link to="/" className="back-link">← Back to Landing Page</Link>
          </div>
        </div>
      </main>

      <FooterCard />
    </div>
  );
}
