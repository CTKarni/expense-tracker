import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, RefreshCw, Landmark, LogOut, Wallet, Users } from 'lucide-react';
import { auth } from '../firebase';

function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Wallet color="#3b82f6" />
        ExpenseTracker
      </div>
      
      <nav className="nav-links">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
          <LayoutDashboard size={20} /> Dashboard
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
      </nav>

      <div className="user-profile">
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          <strong>{user.displayName || 'User'}</strong>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{user.email}</div>
        </div>
        <button 
          onClick={onLogout} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
