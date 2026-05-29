import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, RotateCcw, User, Calendar, Coins, AlertCircle, MoreHorizontal } from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';

const API_URL = `http://${window.location.hostname}:3001`;

function Debts({ token }) {
  const [debts, setDebts] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'settled'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    friendName: '',
    amount: '',
    currency: '₹',
    date: new Date().toISOString().split('T')[0],
    type: 'lent' // 'lent' or 'borrowed'
  });

  useEffect(() => {
    fetchDebts();
  }, [token]);

  const fetchDebts = async () => {
    try {
      const res = await fetch(`${API_URL}/debts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDebts(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.friendName || !formData.amount) return;

    const bodyData = {
      friendName: formData.friendName.trim(),
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      date: formData.date,
      type: formData.type
    };

    if (editingId) {
      // Update existing debt
      const existingDebt = debts.find(d => d.id === editingId);
      const updatedDebt = {
        ...bodyData,
        status: existingDebt ? existingDebt.status : 'pending'
      };

      try {
        const res = await fetch(`${API_URL}/debts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(updatedDebt)
        });
        if (res.ok) {
          setDebts(debts.map(d => d.id === editingId ? { ...d, ...updatedDebt } : d));
          resetForm();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Create new debt
      const newDebt = {
        id: crypto.randomUUID(),
        ...bodyData,
        status: 'pending'
      };

      try {
        const res = await fetch(`${API_URL}/debts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newDebt)
        });
        if (res.ok) {
          setDebts([newDebt, ...debts]);
          resetForm();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleSettle = async (debt) => {
    const updatedDebt = {
      ...debt,
      status: debt.status === 'pending' ? 'settled' : 'pending'
    };

    try {
      const res = await fetch(`${API_URL}/debts/${debt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedDebt)
      });
      if (res.ok) {
        setDebts(debts.map(d => d.id === debt.id ? updatedDebt : d));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (debt) => {
    setEditingId(debt.id);
    setFormData({
      friendName: debt.friendName,
      amount: debt.amount,
      currency: debt.currency,
      date: debt.date,
      type: debt.type
    });
  };

  const deleteDebt = async (id) => {
    try {
      const res = await fetch(`${API_URL}/debts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDebts(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      friendName: '',
      amount: '',
      currency: '₹',
      date: new Date().toISOString().split('T')[0],
      type: 'lent'
    });
  };

  // Calculations (only for pending debts)
  const pendingDebts = debts.filter(d => d.status === 'pending');
  const settledDebts = debts.filter(d => d.status === 'settled');

  const calculateTotals = (list) => {
    const totals = {};
    list.forEach(d => {
      const cur = d.currency;
      if (!totals[cur]) totals[cur] = { lent: 0, borrowed: 0 };
      if (d.type === 'lent') {
        totals[cur].lent += d.amount;
      } else {
        totals[cur].borrowed += d.amount;
      }
    });
    return totals;
  };

  const pendingTotals = calculateTotals(pendingDebts);
  
  const getSummaryDisplay = (type) => {
    const keys = Object.keys(pendingTotals);
    if (keys.length === 0) return `${type === 'net' ? '' : '₹'}0.00`;
    
    return keys.map(cur => {
      const { lent, borrowed } = pendingTotals[cur];
      if (type === 'lent') {
        return `${cur}${lent.toFixed(2)}`;
      } else if (type === 'borrowed') {
        return `${cur}${borrowed.toFixed(2)}`;
      } else {
        const net = lent - borrowed;
        const sign = net >= 0 ? '+' : '-';
        return `${sign}${cur}${Math.abs(net).toFixed(2)}`;
      }
    }).join(' | ');
  };

  const getNetColor = () => {
    const keys = Object.keys(pendingTotals);
    if (keys.length === 0) return 'var(--text-secondary)';
    const firstKey = keys[0];
    const { lent, borrowed } = pendingTotals[firstKey];
    const net = lent - borrowed;
    if (net > 0) return 'var(--accent-success)';
    if (net < 0) return 'var(--accent-danger)';
    return 'var(--text-primary)';
  };

  const displayedList = activeTab === 'pending' ? pendingDebts : settledDebts;

  const displayDateText = (dateVal) => {
    if (dateVal === 'approximate') {
      return (
        <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
          <AlertCircle size={14} style={{ color: '#e0a800' }} />
          Date Approximate
        </span>
      );
    }
    const [y, m, d] = dateVal.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ letterSpacing: '-0.02em' }}>Friends & Debts Tracker</h1>
        <p>Keep track of money you've lent to or borrowed from friends.</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Total Owed to You (Lent)</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value" style={{ color: '#10b981' }}>
            {getSummaryDisplay('lent')}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Total You Owe (Borrowed)</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value" style={{ color: '#ef4444' }}>
            {getSummaryDisplay('borrowed')}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Net Balance</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value" style={{ color: getNetColor() }}>
            {getSummaryDisplay('net')}
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="card">
        <div className="card-header-actions">
          <h3 className="card-title">
            {editingId ? 'Edit Debt Record' : 'Log New Debt / Transaction'}
          </h3>
          <MoreHorizontal size={18} className="card-dots" />
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Friend's Name</label>
            <input 
              type="text" 
              placeholder="e.g. Rahul Sharma" 
              value={formData.friendName}
              onChange={e => setFormData({ ...formData, friendName: e.target.value })}
              required 
            />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <div className="amount-currency-group">
              <select 
                value={formData.currency} 
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="currency-select"
                style={{ width: '110px' }}
              >
                <option value="₹">INR (₹)</option>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
              </select>
              <input 
                type="number" 
                placeholder="0.00" 
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                step="0.01" 
                min="0.01" 
                required 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Transaction Date</label>
            <ModernDatePicker 
              value={formData.date}
              onChange={date => setFormData({ ...formData, date })}
              disabled={formData.date === 'approximate'}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="approximateDate" 
                checked={formData.date === 'approximate'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({ ...formData, date: 'approximate' });
                  } else {
                    setFormData({ ...formData, date: new Date().toISOString().split('T')[0] });
                  }
                }}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="approximateDate" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)', userSelect: 'none' }}>
                I don't remember the exact transaction date
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="lent">Lent (They owe you)</option>
              <option value="borrowed">Borrowed (You owe them)</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', gap: '0.5rem', flexDirection: 'row', alignItems: 'flex-end' }}>
            <button type="submit" className="primary-btn" style={{ flex: 1 }}>
              <Plus size={18} /> {editingId ? 'Update' : 'Add Record'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm} 
                className="primary-btn" 
                style={{ background: 'var(--text-secondary)', color: 'white' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? '#0d2b1e' : 'var(--surface-color)',
            color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (activeTab === 'pending' ? '#0d2b1e' : 'var(--border-color)'),
            padding: '0.5rem 1.25rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          Active / Pending ({pendingDebts.length})
        </button>
        <button 
          onClick={() => setActiveTab('settled')}
          style={{
            background: activeTab === 'settled' ? '#0d2b1e' : 'var(--surface-color)',
            color: activeTab === 'settled' ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (activeTab === 'settled' ? '#0d2b1e' : 'var(--border-color)'),
            padding: '0.5rem 1.25rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          Settled History ({settledDebts.length})
        </button>
      </div>

      {/* Table Card Overhauled into List */}
      <div className="card">
        <div className="card-header-actions">
          <h3 className="card-title">
            {activeTab === 'pending' ? 'Outstanding Transactions' : 'Settled History'}
          </h3>
          <MoreHorizontal size={18} className="card-dots" />
        </div>
        {displayedList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {displayedList.map(debt => (
              <div key={debt.id} className="transaction-row-item">
                <div className="user-avatar" style={{ background: debt.type === 'lent' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: debt.type === 'lent' ? '#10b981' : '#ef4444' }}>
                  {debt.friendName ? debt.friendName[0].toUpperCase() : <User size={16} />}
                </div>
                <div className="transaction-details">
                  <span className="transaction-desc" style={{ textTransform: 'capitalize' }}>{debt.friendName}</span>
                  <span className="transaction-date" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    {displayDateText(debt.date)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Status Badges mapping to green for active/lent, grey for settled, red for borrowed */}
                  <span 
                    className="transaction-badge" 
                    style={{
                      backgroundColor: debt.status === 'settled' 
                        ? 'rgba(107, 114, 128, 0.1)' 
                        : debt.type === 'lent' 
                          ? 'rgba(16, 185, 129, 0.1)' 
                          : 'rgba(239, 68, 68, 0.1)',
                      color: debt.status === 'settled' 
                        ? '#6b7280' 
                        : debt.type === 'lent' 
                          ? '#10b981' 
                          : '#ef4444',
                      border: `1px solid ${
                        debt.status === 'settled' 
                          ? 'rgba(107, 114, 128, 0.2)' 
                          : debt.type === 'lent' 
                            ? 'rgba(16, 185, 129, 0.2)' 
                            : 'rgba(239, 68, 68, 0.2)'
                      }`
                    }}
                  >
                    {debt.status === 'settled' ? 'Settled' : debt.type === 'lent' ? 'Lent' : 'Borrowed'}
                  </span>
                  <span className="transaction-amount" style={{ color: debt.type === 'lent' ? '#10b981' : '#ef4444' }}>
                    {debt.type === 'lent' ? '+' : '-'}{debt.currency}{debt.amount.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button 
                    className="delete-row-btn" 
                    onClick={() => toggleSettle(debt)}
                    title={debt.status === 'pending' ? "Mark as Settled" : "Re-open Transaction"}
                    style={{ color: debt.status === 'pending' ? '#10b981' : 'var(--text-secondary)' }}
                  >
                    {debt.status === 'pending' ? <Check size={16} /> : <RotateCcw size={16} />}
                  </button>
                  <button 
                    className="delete-row-btn" 
                    onClick={() => startEdit(debt)}
                    title="Edit transaction"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-row-btn" 
                    onClick={() => deleteDebt(debt.id)}
                    title="Delete transaction"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
            <Coins size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>{activeTab === 'pending' ? 'All settled! No outstanding transactions.' : 'No settled history found.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Debts;
