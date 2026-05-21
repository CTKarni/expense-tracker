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
        <Wallet color="var(--accent-primary)" />
        ExpenseTracker
      </div>
      
      <nav className="nav-links">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/income" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Receipt size={20} /> Income
        </NavLink>
        <NavLink to="/subscriptions" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <RefreshCw size={20} /> Subscriptions
        </NavLink>
        <NavLink to="/loans" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Landmark size={20} /> Loans
        </NavLink>
        <NavLink to="/debts" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Users size={20} /> Debts
        </NavLink>
        <NavLink to="/archive" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Archive size={20} /> Archive
        </NavLink>
      </nav>

      <div className="user-profile">
        <div className="profile-details-container">
          <div className="profile-info-text">
            <strong>{user.displayName || 'User'}</strong>
            <div>{user.email}</div>
          </div>
          <button 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="theme-toggle-btn"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
        <button 
          onClick={onLogout} 
          className="logout-btn"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
