import { useCallback, useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DemoPage, {
  buildInitialSession,
  deriveFromControls,
  withScore,
  CONTROL_FIELDS,
} from './pages/DemoPage';
import AttractorPage from './pages/AttractorPage';

// ---------------------------------------------------------------------------
// Session state is lifted here so DemoPage and AttractorPage share the same
// live experiment without any duplication of Hopfield logic.
//
// buildInitialSession, deriveFromControls, withScore, and CONTROL_FIELDS are
// re-exported from DemoPage.jsx — their implementations are unchanged.
// ---------------------------------------------------------------------------

export default function App() {
  const [user, setUser] = useState(null);

  // Session: lifted from DemoPage — same useState call and initial structure.
  const [session, setSession] = useState(buildInitialSession);

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

  // updateSession — verbatim from DemoPage, exact same merge semantics.
  const updateSession = useCallback((partial) => {
    setSession((prev) => {
      const next = { ...prev, ...partial };
      const touchesControls = CONTROL_FIELDS.some((field) => field in partial);
      const callerSuppliedResult = 'retrievalResult' in partial;
      if (touchesControls && !callerSuppliedResult) {
        if ('patternCount' in partial) {
          next.customStoredPatterns = null;
        }
        Object.assign(next, deriveFromControls(next));
      }
      return next;
    });
  }, []);

  // proveItRunning is needed by DemoPage's UI — keep it here next to session
  const [proveItRunning, setProveItRunning] = useState(false);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<LandingPage user={user} onLogout={handleLogout} />} />
        <Route path="/login" element={<LoginPage user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
        <Route path="/signup" element={<SignupPage user={user} onLogin={handleLogin} onLogout={handleLogout} />} />
        <Route
          path="/demo"
          element={
            <DemoPage
              session={session}
              updateSession={updateSession}
              proveItRunning={proveItRunning}
              setProveItRunning={setProveItRunning}
            />
          }
        />
        <Route
          path="/attractor"
          element={<AttractorPage session={session} />}
        />
      </Routes>
    </div>
  );
}
