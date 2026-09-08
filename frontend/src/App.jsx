import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DemoPage from './pages/DemoPage';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('hebbian_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('hebbian_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('hebbian_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hebbian_user');
  };

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<LandingPage user={user} onLogout={handleLogout} />} />
        <Route path="/login" element={<LoginPage user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
        <Route path="/signup" element={<SignupPage user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </div>
  );
}
