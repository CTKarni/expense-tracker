import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Wallet, MoreHorizontal } from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';
import { generateUUID } from '../utils/uuid';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

function Income({ token }) {
  const [incomes, setIncomes] = useState([]);
  const [formData, setFormData] = useState({
    source: 'salary',
    customSource: '',
    amount: '',
    currency: '₹',
    date: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIncomes();
  }, [token]);

  const fetchIncomes = async () => {
    try {
      const res = await fetch(`${API_URL}/income`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIncomes(await res.json());
      }
    } catch (err) {
      console.error('Error fetching income', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.amount || !formData.date) return;

    const finalSource = formData.source === 'other' ? (formData.customSource || 'Other') : formData.source;

    const newIncome = {
      id: generateUUID(),
      source: finalSource,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      date: formData.date
    };

    try {
      const res = await fetch(`${API_URL}/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newIncome)
      });
      if (res.ok) {
        setIncomes(prev => [newIncome, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setFormData(prev => ({ ...prev, customSource: '', amount: '' }));
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add income');
      }
    } catch (err) {
      console.error('Error adding income', err);
      setError(`Connection error: Failed to reach the server. ${err.message || ''}`);
    }
  };

  const deleteIncome = async (id) => {
    try {
      const res = await fetch(`${API_URL}/income/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIncomes(prev => prev.filter(inc => inc.id !== id));
      }
    } catch (err) {
      console.error('Error deleting income', err);
    }
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1 style={{ letterSpacing: '-0.02em' }}>Income Tracker</h1>
        <p>Monitor your active income streams and savings resources.</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Total Registered Income</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value" style={{ color: '#10b981' }}>
            {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Income Sources</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value">{incomes.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header-actions">
          <h3 className="card-title">Log New Income Stream</h3>
          <MoreHorizontal size={18} className="card-dots" />
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              gridColumn: 'span 2',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--accent-danger)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Source Type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select name="source" value={formData.source} onChange={handleInputChange} style={{ flex: formData.source === 'other' ? '0 0 40%' : '1' }}>
                <option value="salary">Salary</option>
                <option value="freelance">Freelance / Gig</option>
                <option value="investments">Investments</option>
                <option value="other">Other</option>
              </select>
              {formData.source === 'other' && (
                <input
                  type="text"
                  name="customSource"
                  placeholder="e.g. Sold Car, Gift"
                  value={formData.customSource}
                  onChange={handleInputChange}
                  required
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <div className="amount-currency-group">
              <select name="currency" value={formData.currency} onChange={handleInputChange} className="currency-select" style={{ width: '110px' }}>
                <option value="₹">INR (₹)</option>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
              </select>
              <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} step="0.01" min="0" required />
            </div>
          </div>
          <div className="form-group">
            <label>Date Received</label>
            <ModernDatePicker 
              value={formData.date}
              onChange={date => setFormData(prev => ({ ...prev, date }))}
            />
          </div>
          <div className="form-group">
            <button type="submit" className="primary-btn"><Plus size={18}/> Log Income</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header-actions">
          <h3 className="card-title">Income History</h3>
          <MoreHorizontal size={18} className="card-dots" />
        </div>
        {incomes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {incomes.map(income => (
              <div key={income.id} className="transaction-row-item">
                <div className="transaction-icon-box" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                  <Wallet size={18} style={{ color: '#10b981' }} />
                </div>
                <div className="transaction-details">
                  <span className="transaction-desc" style={{ textTransform: 'capitalize' }}>{income.source}</span>
                  <span className="transaction-date" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    {new Date(income.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="transaction-amount-badge">
                  <span className="transaction-amount" style={{ color: '#10b981' }}>
                    +{income.currency}{income.amount.toFixed(2)}
                  </span>
                </div>
                <button className="delete-row-btn" onClick={() => deleteIncome(income.id)} title="Delete income">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
            <Wallet size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No income streams logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Income;
