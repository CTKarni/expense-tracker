import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { auth, provider, signInWithPopup } from './firebase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Subscriptions from './components/Subscriptions';
import Loans from './components/Loans';
import Debts from './components/Debts';
import Income from './components/Income';
import Archive from './components/Archive';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mockMode, setMockMode] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showPopupHint, setShowPopupHint] = useState(false);

  useEffect(() => {
    // Check if guest user session is active
    const storedGuest = localStorage.getItem('guestUser');
    if (storedGuest) {
      setUser(JSON.parse(storedGuest));
      setToken('mock-' + JSON.parse(storedGuest).uid);
      setLoading(false);
      return;
    }

    // Check if mock user session is active
    const storedMock = localStorage.getItem('mockUser');
    if (storedMock) {
      setUser(JSON.parse(storedMock));
      setToken('mock-' + JSON.parse(storedMock).uid);
      setLoading(false);
      return;
    }

    // If Firebase Auth is not configured properly, it will not fire state changes.
    // We add a mock fallback for dev testing if they haven't configured Google Cloud yet.
    if (!auth) {
      setMockMode(true);
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setToken(token);
      } else {
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    if (mockMode) {
      const fakeUser = { uid: 'mock-user-1', displayName: 'Mock User', email: 'mock@example.com' };
      localStorage.setItem('mockUser', JSON.stringify(fakeUser));
      setUser(fakeUser);
      setToken('mock-' + fakeUser.uid);
      return;
    }
    
    setIsSigningIn(true);
    setShowPopupHint(false);
    
    // Set a timer to show popup blocker hint if authentication hangs
    const hintTimer = setTimeout(() => {
      setShowPopupHint(true);
    }, 4500);
    
    try {
      await signInWithPopup(auth, provider);
      clearTimeout(hintTimer);
      setIsSigningIn(false);
    } catch (error) {
      clearTimeout(hintTimer);
      setIsSigningIn(false);
      console.error("Error signing in with Google", error);
      
      let message = error.message;
      if (error.code === 'auth/popup-blocked') {
        message = 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = `This domain (${window.location.hostname}) is not authorized for Google Sign-In. Add it in your Firebase Console.`;
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'The sign-in window was closed before completing authentication. Please try again.';
      }
      setAuthError(message);
    }
  };

  const handleGuestSignIn = () => {
    setAuthError(null);
    const guestUser = { uid: 'guest-user', displayName: 'Guest Preview', email: 'guest@example.com' };
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
    setToken('mock-' + guestUser.uid);
  };

  const handleLogout = async () => {
    localStorage.removeItem('guestUser');
    localStorage.removeItem('mockUser');
    setUser(null);
    setToken(null);
    if (auth) {
      await auth.signOut();
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-color)',
        color: 'var(--text-primary)'
      }}>
        <div className="spinner" style={{ marginBottom: '1.25rem' }}></div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading OmniLedger...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Welcome to OmniLedger</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Sign in to manage your expenses, subscriptions, and loans.</p>
          
          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--accent-danger)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Sign-in Error:</strong>
                <div style={{ marginTop: '0.25rem', lineHeight: '1.35' }}>{authError}</div>
              </div>
            </div>
          )}

          {showPopupHint && isSigningIn && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: '#d97706',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Popup Blocker Alert?</strong>
                <div style={{ marginTop: '0.25rem', lineHeight: '1.35' }}>
                  If the sign-in window didn't open, please check your browser's popup blocker, or switch to **Guest Mode** or **Mock Auth** below.
                </div>
              </div>
            </div>
          )}

          <button 
            className="google-btn" 
            onClick={handleGoogleSignIn} 
            disabled={isSigningIn}
            style={{
              opacity: isSigningIn ? 0.75 : 1,
              cursor: isSigningIn ? 'not-allowed' : 'pointer'
            }}
          >
            {isSigningIn ? (
              <RefreshCw className="spin-icon" size={18} />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: 18 }}/>
            )}
            {isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}
          </button>
          
          <button className="guest-btn" onClick={handleGuestSignIn} disabled={isSigningIn}>
            <User size={18} />
            Explore as Guest (Offline Mode)
          </button>

          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setMockMode(!mockMode)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              {mockMode ? 'Switch to Real Firebase Auth' : 'Switch to Local/Developer Mock Auth'}
            </button>
            {mockMode && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'orange', fontWeight: 500 }}>
                ⚠️ Mock Mode Active: Continue with Google will log you in locally.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/income" element={<Income token={token} />} />
            <Route path="/subscriptions" element={<Subscriptions token={token} />} />
            <Route path="/loans" element={<Loans token={token} />} />
            <Route path="/debts" element={<Debts token={token} />} />
            <Route path="/archive" element={<Archive token={token} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
