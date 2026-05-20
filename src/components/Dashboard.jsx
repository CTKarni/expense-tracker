import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ShoppingBag, CreditCard, Wallet } from 'lucide-react';

const API_URL = 'http://localhost:3001';

function Dashboard({ token }) {
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: '$',
    category: 'everyday',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, [token]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Error fetching expenses', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) return;
    
    const newExpense = {
      id: crypto.randomUUID(),
      ...formData,
      amount: parseFloat(formData.amount)
    };
    
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newExpense)
      });
      if (res.ok) {
        setExpenses(prev => [newExpense, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setFormData(prev => ({ ...prev, description: '', amount: '' }));
      }
    } catch (err) {
      console.error('Error adding expense', err);
    }
  };

  const deleteExpense = async (id) => {
    try {
      const res = await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExpenses(prev => prev.filter(exp => exp.id !== id));
      }
    } catch (err) {
      console.error('Error deleting expense', err);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of all your logged expenses</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Expenses</span>
          <div className="summary-value">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Entries</span>
          <div className="summary-value">{expenses.length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Quick Add Expense</h3>
        <form className="form-grid" onSubmit={handleExpenseSubmit}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Description</label>
            <input type="text" name="description" value={formData.description} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <div className="amount-currency-group">
              <select name="currency" value={formData.currency} onChange={handleInputChange}>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
                <option value="₹">INR (₹)</option>
                <option value="¥">JPY (¥)</option>
              </select>
              <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} step="0.01" min="0" required />
            </div>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select name="category" value={formData.category} onChange={handleInputChange}>
              <option value="everyday">Everyday Expense</option>
              <option value="emi">Loan EMI</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <button type="submit" className="primary-btn"><Plus size={18}/> Add</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent Expenses</h3>
        {expenses.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} />
                      {new Date(expense.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{expense.description}</td>
                  <td><span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{expense.category}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {expense.currency}{expense.amount.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="delete-btn" onClick={() => deleteExpense(expense.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <Wallet size={32} className="empty-icon" />
            <p>No expenses logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
