import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, RefreshCw, Landmark, LogOut, Wallet, Users, Sun, Moon, Archive } from 'lucide-react';
import { auth } from '../firebase';

function Sidebar({ user, onLogout }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Wallet size={24} />
        <span>ExpenseTracker</span>
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
        
        <div className="sidebar-section-label hide-on-mobile">GENERAL</div>
        <button onClick={toggleTheme} className="nav-action-btn hide-on-mobile" title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button onClick={onLogout} className="nav-action-btn hide-on-mobile" title="Logout">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>

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
            <div>{user.email}</div>
          </div>
          <button 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="theme-toggle-btn hide-on-desktop"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button 
            onClick={onLogout} 
            title="Logout"
            className="logout-btn hide-on-desktop"
            style={{ width: '34px', height: '34px', borderRadius: '50%', padding: 0 }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
