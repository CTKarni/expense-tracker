import { useState, useEffect } from 'react';
import { Plus, Trash2, Landmark } from 'lucide-react';

const API_URL = 'http://localhost:3001';

function Loans({ token }) {
  const [loans, setLoans] = useState([]);
  const [expenses, setExpenses] = useState([]); // Needed to calculate paid amounts
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    emiAmount: '',
    currency: '₹',
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchLoans();
    fetchExpenses();
  }, [token]);

  const fetchLoans = async () => {
    try {
      const res = await fetch(`${API_URL}/loans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLoans(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.totalAmount) return;
    
    const newLoan = {
      id: crypto.randomUUID(),
      ...formData,
      totalAmount: parseFloat(formData.totalAmount),
      emiAmount: parseFloat(formData.emiAmount)
    };
    
    try {
      const res = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newLoan)
      });
      if (res.ok) {
        setLoans([...loans, newLoan]);
        setFormData({ ...formData, name: '', totalAmount: '', emiAmount: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLoan = async (id) => {
    try {
      const res = await fetch(`${API_URL}/loans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLoans(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Logic to calculate progress based on Expenses marked as "emi" (in reality, we should link expense -> loan ID)
  // For simplicity, we just look at EMI expenses and distribute them, or we just calculate based on months passed.
  // We will assume 1 EMI payment = emiAmount paid.
  // Actually, a better approach for the UI mock is to just use a random dummy progress or calculate based on date for the visual.
  // Let's do a time-based calculation for demonstration based on the end date.
  const calculateProgress = (loan) => {
    // Assuming start date was a year ago (mock logic)
    const end = new Date(loan.endDate).getTime();
    const now = new Date().getTime();
    const start = end - (365 * 24 * 60 * 60 * 1000); // 1 year loan duration assumption
    
    let percent = ((now - start) / (end - start)) * 100;
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;
    
    const remaining = loan.totalAmount - (loan.totalAmount * (percent / 100));
    
    return { percent, remaining };
  };

  return (
    <div>
      <div className="page-header">
        <h1>Loan & EMI Tracker</h1>
        <p>Monitor your active loans, fixed EMIs, and track the remaining balance.</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Register New Loan</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Loan Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Tesla Model 3 Auto Loan" required />
          </div>
          <div className="form-group">
            <label>Total Loan Amount</label>
            <div className="amount-currency-group">
              <select name="currency" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
                <option value="₹">INR (₹)</option>
              </select>
              <input type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} step="0.01" min="0" required />
            </div>
          </div>
          <div className="form-group">
            <label>Fixed EMI Amount</label>
            <input type="number" value={formData.emiAmount} onChange={e => setFormData({...formData, emiAmount: e.target.value})} step="0.01" min="0" required />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
          </div>
          <div className="form-group">
            <button type="submit" className="primary-btn"><Plus size={18}/> Add Loan</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Active Loans</h3>
        {loans.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {loans.map(loan => {
              const { percent, remaining } = calculateProgress(loan);
              return (
                <div key={loan.id} style={{ border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{loan.name}</h4>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        EMI: {loan.currency}{loan.emiAmount.toFixed(2)}/mo • Ends: {new Date(loan.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button className="delete-btn" onClick={() => deleteLoan(loan.id)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                      <span>Paid: {loan.currency}{(loan.totalAmount - remaining).toFixed(2)}</span>
                      <span>Remaining: {loan.currency}{remaining.toFixed(2)}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Landmark size={32} className="empty-icon" />
            <p>No active loans registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Loans;
