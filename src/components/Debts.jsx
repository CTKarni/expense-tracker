import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, RotateCcw, User, Calendar, Coins } from 'lucide-react';

const API_URL = 'http://localhost:3001';

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

  return (
    <div>
      <div className="page-header">
        <h1>Friends & Debts Tracker</h1>
        <p>Keep track of money you've lent to or borrowed from friends.</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Owed to You (Lent)</span>
          <div className="summary-value" style={{ color: 'var(--accent-success)' }}>
            {getSummaryDisplay('lent')}
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total You Owe (Borrowed)</span>
          <div className="summary-value" style={{ color: 'var(--accent-danger)' }}>
            {getSummaryDisplay('borrowed')}
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Net Balance</span>
          <div className="summary-value" style={{ color: getNetColor() }}>
            {getSummaryDisplay('net')}
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>
          {editingId ? 'Edit Debt Record' : 'Log New Debt / Transaction'}
        </h3>
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
            <label>Date Given / Taken</label>
            <input 
              type="date" 
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              required 
            />
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
                style={{ background: 'var(--text-secondary)' }}
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
            background: activeTab === 'pending' ? 'var(--accent-primary)' : 'var(--surface-color)',
            color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (activeTab === 'pending' ? 'var(--accent-primary)' : 'var(--border-color)'),
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Active / Pending ({pendingDebts.length})
        </button>
        <button 
          onClick={() => setActiveTab('settled')}
          style={{
            background: activeTab === 'settled' ? 'var(--accent-primary)' : 'var(--surface-color)',
            color: activeTab === 'settled' ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (activeTab === 'settled' ? 'var(--accent-primary)' : 'var(--border-color)'),
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Settled History ({settledDebts.length})
        </button>
      </div>

      {/* Table Card */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>
          {activeTab === 'pending' ? 'Outstanding Transactions' : 'Settled History'}
        </h3>
        {displayedList.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Friend</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ width: '120px' }}></th>
                </tr>
              </thead>
              <tbody>
                {displayedList.map(debt => (
                  <tr key={debt.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                        <User size={16} color="var(--accent-primary)" />
                        {debt.friendName}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                        <Calendar size={14} />
                        {new Date(debt.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontWeight: 500,
                          background: debt.type === 'lent' ? '#e6f4ea' : '#fce8e6',
                          color: debt.type === 'lent' ? 'var(--accent-success)' : 'var(--accent-danger)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {debt.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {debt.currency}{debt.amount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{
                          fontSize: '0.8rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 500,
                          background: debt.status === 'settled' ? '#e8f0fe' : '#fef7e0',
                          color: debt.status === 'settled' ? 'var(--accent-primary)' : '#b06000'
                        }}
                      >
                        {debt.status === 'settled' ? 'Settled' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="delete-btn" 
                          onClick={() => toggleSettle(debt)}
                          title={debt.status === 'pending' ? "Mark as Settled" : "Re-open Transaction"}
                          style={{ color: debt.status === 'pending' ? 'var(--accent-success)' : 'var(--text-secondary)' }}
                        >
                          {debt.status === 'pending' ? <Check size={16} /> : <RotateCcw size={16} />}
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => startEdit(debt)}
                          title="Edit"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => deleteDebt(debt.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Coins size={32} className="empty-icon" />
            <p>{activeTab === 'pending' ? 'All settled! No outstanding transactions.' : 'No settled history found.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Debts;
