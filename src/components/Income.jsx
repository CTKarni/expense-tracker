import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Wallet } from 'lucide-react';

const API_URL = 'http://localhost:3001';

function Income({ token }) {
  const [incomes, setIncomes] = useState([]);
  const [formData, setFormData] = useState({
    source: 'salary',
    customSource: '',
    amount: '',
    currency: '₹',
    date: new Date().toISOString().split('T')[0]
  });

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
    if (!formData.amount || !formData.date) return;

    const finalSource = formData.source === 'other' ? (formData.customSource || 'Other') : formData.source;

    const newIncome = {
      id: crypto.randomUUID(),
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
      }
    } catch (err) {
      console.error('Error adding income', err);
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
        <h1>Income Tracker</h1>
        <p>Monitor your active income streams and savings resources.</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Registered Income</span>
          <div className="summary-value" style={{ color: 'var(--accent-success)' }}>
            {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Income Sources</span>
          <div className="summary-value">{incomes.length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Log New Income Stream</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
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
              <select name="currency" value={formData.currency} onChange={handleInputChange}>
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
            <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <button type="submit" className="primary-btn"><Plus size={18}/> Log Income</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Income History</h3>
        {incomes.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incomes.map(income => (
                  <tr key={income.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} />
                        {new Date(income.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{income.source}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-success)' }}>
                      {income.currency}{income.amount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="delete-btn" onClick={() => deleteIncome(income.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Wallet size={32} className="empty-icon" />
            <p>No income streams logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Income;
