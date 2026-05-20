import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, provider, signInWithPopup } from './firebase';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Subscriptions from './components/Subscriptions';
import Loans from './components/Loans';
import Debts from './components/Debts';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mockMode, setMockMode] = useState(false);

  useEffect(() => {
    // If Firebase Auth is not configured properly, it will not fire state changes.
    // We add a mock fallback for dev testing if they haven't configured Google Cloud yet.
    if (!auth) {
      const storedMock = localStorage.getItem('mockUser');
      if (storedMock) {
        setUser(JSON.parse(storedMock));
        setToken('mock-' + JSON.parse(storedMock).uid);
      }
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
    if (mockMode) {
      const fakeUser = { uid: 'mock-user-1', displayName: 'Mock User', email: 'mock@example.com' };
      localStorage.setItem('mockUser', JSON.stringify(fakeUser));
      setUser(fakeUser);
      setToken('mock-' + fakeUser.uid);
      return;
    }
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      alert(`Failed to sign in: ${error.code || error.message}\n\nCommon Fix:\nAdd your domain (${window.location.hostname}) to the "Authorized Domains" list in the Firebase Console under: Build > Authentication > Settings > Authorized Domains.`);
    }
  };

  const handleLogout = async () => {
    if (mockMode) {
      localStorage.removeItem('mockUser');
      setUser(null);
      setToken(null);
      return;
    }
    await auth.signOut();
  };

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          <h2>Welcome to ExpenseTracker</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Sign in to manage your expenses, subscriptions, and loans.</p>
          <button className="google-btn" onClick={handleGoogleSignIn}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: 18 }}/>
            Continue with Google
          </button>
          {mockMode && <p style={{marginTop: '1rem', fontSize: '0.8rem', color: 'orange'}}>Running in Mock Mode because Firebase is not configured.</p>}
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
            <Route path="/subscriptions" element={<Subscriptions token={token} />} />
            <Route path="/loans" element={<Loans token={token} />} />
            <Route path="/debts" element={<Debts token={token} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
