import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, RefreshCw, Landmark, LogOut, Wallet, Users, Sun, Moon, Archive, Menu, X } from 'lucide-react';

function Sidebar({ user, onLogout }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close drawer automatically when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="mobile-header hide-on-desktop">
        <button 
          onClick={() => setIsOpen(true)} 
          className="hamburger-btn" 
          aria-label="Open Menu"
        >
          <Menu size={24} />
        </button>
        
        <div className="mobile-header-logo">
          <Wallet size={20} />
          <span>OmniLedger</span>
        </div>

        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn" 
          title="Toggle Theme"
          style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Backdrop Overlay for mobile drawer */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Main Sidebar (Drawer on mobile, stationary sidebar on desktop) */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Drawer header only shown on mobile */}
        <div className="sidebar-header hide-on-desktop">
          <div className="sidebar-logo">
            <Wallet size={24} />
            <span>OmniLedger</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="close-drawer-btn" 
            aria-label="Close Menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Desktop-only Logo */}
        <div className="sidebar-logo hide-on-mobile">
          <Wallet size={24} />
          <span>OmniLedger</span>
        </div>
        
        <nav className="nav-links">
          <div className="sidebar-section-label">MENU</div>
          <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/income" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Receipt size={20} /> <span>Income</span>
          </NavLink>
          <NavLink to="/subscriptions" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <RefreshCw size={20} /> <span>Subscriptions</span>
          </NavLink>
          <NavLink to="/loans" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Landmark size={20} /> <span>Loans</span>
          </NavLink>
          <NavLink to="/debts" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Users size={20} /> <span>Debts</span>
          </NavLink>
          <NavLink to="/archive" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Archive size={20} /> <span>Archive</span>
          </NavLink>
          
          <div className="sidebar-section-label">GENERAL</div>
          <button onClick={toggleTheme} className="nav-action-btn" title="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button onClick={onLogout} className="nav-action-btn" title="Logout">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>

        {/* User profile details at the bottom */}
        <div className="user-profile">
          <div className="profile-details-container">
            <div className="user-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} />
              ) : (
                <span>{user.displayName ? user.displayName[0].toUpperCase() : 'U'}</span>
              )}
            </div>
            <div className="profile-info-text">
              <strong>{user.displayName || 'User'}</strong>
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '2px' }}>{user.email}</div>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            title="Logout"
            className="logout-btn hide-on-mobile"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

