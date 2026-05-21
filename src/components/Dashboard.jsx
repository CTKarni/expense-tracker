import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ShoppingBag, CreditCard, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// Default budget limits in INR (₹) base (default to 1000 INR as requested)
const DEFAULT_BUDGETS = {
  food: 1000,
  travel: 1000,
  shopping: 1000,
  entertainment: 1000,
  utilities: 1000,
  other: 1000
};

const CATEGORY_COLORS = {
  food: '#ef4444',         // Red
  travel: '#f59e0b',       // Amber
  shopping: '#3b82f6',     // Blue
  entertainment: '#ec4899',// Pink
  utilities: '#10b981',   // Green
  other: '#8b5cf6'         // Purple
};

const PAYMENT_MODE_COLORS = {
  'Google Pay': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
  'PhonePe': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' },
  'Paytm': { bg: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.2)' },
  'Cash': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  'Card': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'Net Banking': { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' }
};

function Dashboard({ token }) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [displayCurrency, setDisplayCurrency] = useState('₹');
  const [exchangeRates, setExchangeRates] = useState({
    base: '₹',
    rates: { '₹': 1, '$': 83.3, '€': 90.5, '£': 105.2, '¥': 0.54 }
  });

  const [customBudgets, setCustomBudgets] = useState(DEFAULT_BUDGETS);
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);
  const [tempBudgets, setTempBudgets] = useState(DEFAULT_BUDGETS);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: '₹',
    category: 'food',
    paymentMode: 'Google Pay',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
    fetchIncomes();
    fetchExchangeRates();
    fetchBudgets();
  }, [token]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExpenses(await res.json());
      }
    } catch (err) {
      console.error('Error fetching expenses', err);
    }
  };

  const fetchIncomes = async () => {
    try {
      const res = await fetch(`${API_URL}/income`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIncomes(await res.json());
      }
    } catch (err) {
      console.error('Error fetching incomes', err);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const res = await fetch(`${API_URL}/exchange-rates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExchangeRates(await res.json());
      }
    } catch (err) {
      console.warn('Backend exchange-rates API not configured. Using frontend fallback.', err);
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`${API_URL}/budgets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const merged = { ...DEFAULT_BUDGETS };
        data.forEach(item => {
          merged[item.category] = item.limitAmount;
        });
        setCustomBudgets(merged);
        setTempBudgets(merged);
      }
    } catch (err) {
      console.error('Error fetching budgets', err);
    }
  };

  const saveBudgets = async () => {
    try {
      const promises = Object.keys(tempBudgets).map(category => {
        return fetch(`${API_URL}/budgets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            category,
            limitAmount: parseFloat(tempBudgets[category]) || 0
          })
        });
      });
      await Promise.all(promises);
      setCustomBudgets(tempBudgets);
      setIsEditingBudgets(false);
    } catch (err) {
      console.error('Error saving budgets', err);
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
        setFormData(prev => ({ ...prev, description: '', amount: '', paymentMode: 'Google Pay' }));
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

  // Convert helper
  const convertAmount = (amount, from, to) => {
    const rates = exchangeRates.rates;
    const inBase = amount * (rates[from] || 1);
    return inBase / (rates[to] || 1);
  };

  // Normalization to selected display currency
  const totalExpensesConverted = expenses.reduce((sum, exp) => {
    return sum + convertAmount(exp.amount, exp.currency, displayCurrency);
  }, 0);

  const totalIncomeConverted = incomes.reduce((sum, inc) => {
    return sum + convertAmount(inc.amount, inc.currency, displayCurrency);
  }, 0);

  const netSavings = totalIncomeConverted - totalExpensesConverted;
  const savingsRate = totalIncomeConverted > 0 ? (netSavings / totalIncomeConverted) * 100 : 0;

  // Calculate spending per category in display currency
  const categoryTotals = expenses.reduce((acc, exp) => {
    const amt = convertAmount(exp.amount, exp.currency, displayCurrency);
    acc[exp.category] = (acc[exp.category] || 0) + amt;
    return acc;
  }, {});

  // Generate category budget structures
  const budgetList = Object.keys(customBudgets).map(cat => {
    const limit = convertAmount(customBudgets[cat], '₹', displayCurrency);
    const spent = categoryTotals[cat] || 0;
    const ratio = limit > 0 ? (spent / limit) * 100 : 0;
    
    // Threshold color
    let color = 'var(--accent-success)';
    if (ratio > 100) color = 'var(--accent-danger)';
    else if (ratio > 80) color = 'orange';

    return { category: cat, limit, spent, ratio, color };
  });

  // SVG Chart: Donut
  const donutData = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    value: categoryTotals[cat],
    color: CATEGORY_COLORS[cat] || '#cccccc'
  })).filter(d => d.value > 0);

  const totalDonutValue = donutData.reduce((s, d) => s + d.value, 0);

  // SVG Chart: Balance double bar dimensions
  const chartHeight = 160;
  const chartWidth = 240;
  const maxBarValue = Math.max(totalIncomeConverted, totalExpensesConverted, 1);
  const incomeBarHeight = (totalIncomeConverted / maxBarValue) * chartHeight;
  const expenseBarHeight = (totalExpensesConverted / maxBarValue) * chartHeight;

  // Render SVG Donut Slices
  let accumulatedPercent = 0;
  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~282.74

  const donutSlices = donutData.map((slice, i) => {
    const percent = slice.value / totalDonutValue;
    const strokeDash = percent * donutCircumference;
    const strokeOffset = donutCircumference - strokeDash + (accumulatedPercent * donutCircumference);
    accumulatedPercent -= percent;
    return (
      <circle
        key={i}
        cx="60"
        cy="60"
        r={donutRadius}
        fill="transparent"
        stroke={slice.color}
        strokeWidth="10"
        strokeDasharray={`${strokeDash} ${donutCircumference - strokeDash}`}
        strokeDashoffset={strokeOffset}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    );
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Financial summaries normalized across currencies</p>
        </div>

        {/* Currency Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Display Currency:</label>
          <select 
            value={displayCurrency} 
            onChange={(e) => setDisplayCurrency(e.target.value)}
            style={{ width: '100px', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
          >
            <option value="₹">INR (₹)</option>
            <option value="$">USD ($)</option>
            <option value="€">EUR (€)</option>
            <option value="£">GBP (£)</option>
            <option value="¥">JPY (¥)</option>
          </select>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="summary-grid">
        <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="summary-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <TrendingUp size={16} color="var(--accent-success)" /> Total Income
          </span>
          <div className="summary-value" style={{ color: 'var(--accent-success)' }}>
            {displayCurrency}{totalIncomeConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="summary-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <TrendingDown size={16} color="var(--accent-danger)" /> Total Expenses
          </span>
          <div className="summary-value" style={{ color: 'var(--accent-danger)' }}>
            {displayCurrency}{totalExpensesConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="summary-label">Net Balance</span>
          <div className="summary-value" style={{ color: netSavings >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            {netSavings >= 0 ? '+' : ''}{displayCurrency}{netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="summary-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="summary-label">Net Savings Rate</span>
          <div className="summary-value">
            {savingsRate.toFixed(1)}%
            <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, savingsRate))}%`, background: 'var(--accent-primary)', transition: 'width 0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* SVG Balance comparison Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1rem' }}>Income vs Expense Balance</h3>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', flex: 1, padding: '1rem 0' }}>
            <svg width={chartWidth} height={chartHeight + 30} style={{ overflow: 'visible' }}>
              {/* Gradients */}
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="var(--border-color)" strokeWidth="1" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.5" />

              {/* Income Bar */}
              <rect
                x="40"
                y={chartHeight - incomeBarHeight}
                width="50"
                height={incomeBarHeight}
                fill="url(#incomeGrad)"
                rx="6"
                style={{ transition: 'height 0.4s, y 0.4s' }}
              />
              <text x="65" y={chartHeight - incomeBarHeight - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">
                {displayCurrency}{totalIncomeConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </text>
              <text x="65" y={chartHeight + 18} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="500">
                Income
              </text>

              {/* Expense Bar */}
              <rect
                x="150"
                y={chartHeight - expenseBarHeight}
                width="50"
                height={expenseBarHeight}
                fill="url(#expenseGrad)"
                rx="6"
                style={{ transition: 'height 0.4s, y 0.4s' }}
              />
              <text x="175" y={chartHeight - expenseBarHeight - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">
                {displayCurrency}{totalExpensesConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </text>
              <text x="175" y={chartHeight + 18} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="500">
                Expense
              </text>
            </svg>
          </div>
        </div>

        {/* SVG Donut Category Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1rem' }}>Category Expenses Breakdown</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1rem', flex: 1 }}>
            {donutData.length > 0 ? (
              <>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
                  {donutSlices}
                  {/* Center Hole text */}
                  <circle cx="60" cy="60" r="32" fill="var(--surface-color)" />
                  <text x="60" y="58" textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontWeight="500">
                    TOTAL SPENT
                  </text>
                  <text x="60" y="72" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="700">
                    {displayCurrency}{totalExpensesConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                </svg>
                
                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                  {donutData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></div>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{d.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ({((d.value / totalDonutValue) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0', width: '100%' }}>
                Log expenses to see category breakdowns.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Budgets & Forms Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {/* Category Budget limits tracker */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Monthly Budget Targets</h3>
            {isEditingBudgets ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={saveBudgets} 
                  style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save
                </button>
                <button 
                  onClick={() => { setTempBudgets(customBudgets); setIsEditingBudgets(false); }} 
                  style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'var(--border-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingBudgets(true)} 
                style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'transparent', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
              >
                Edit Limits
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {budgetList.map(budget => (
              <div key={budget.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 500 }}>
                  <span style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CATEGORY_COLORS[budget.category] }}></span>
                    {budget.category}
                  </span>
                  {isEditingBudgets ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{displayCurrency}{budget.spent.toFixed(0)}</strong> / ₹
                      </span>
                      <input 
                        type="number" 
                        value={tempBudgets[budget.category] === undefined ? '' : tempBudgets[budget.category]} 
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                          setTempBudgets(prev => ({ ...prev, [budget.category]: val }));
                        }}
                        style={{ width: '70px', padding: '2px 4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                        min="0"
                      />
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{displayCurrency}{budget.spent.toFixed(0)}</strong> / {displayCurrency}{budget.limit.toFixed(0)}
                    </span>
                  )}
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(100, budget.ratio)}%`, 
                      background: budget.color, 
                      transition: 'width 0.4s, background-color 0.4s' 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Add Expense */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1rem' }}>Quick Add Expense</h3>
          <form className="form-grid" onSubmit={handleExpenseSubmit} style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <label>Description</label>
              <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g. Starbucks Coffee" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Amount</label>
                <div className="amount-currency-group">
                  <select name="currency" value={formData.currency} onChange={handleInputChange} style={{ width: '70px' }}>
                    <option value="$">$</option>
                    <option value="€">€</option>
                    <option value="£">£</option>
                    <option value="₹">₹</option>
                    <option value="¥">¥</option>
                  </select>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} step="0.01" min="0" required style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="food">Food</option>
                  <option value="travel">Travel</option>
                  <option value="shopping">Shopping</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Mode of Transaction</label>
                <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange}>
                  <option value="Google Pay">Google Pay</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Paytm">Paytm</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="primary-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Plus size={18}/> Add Expense</button>
            </div>
          </form>
        </div>
      </div>

      {/* History log card */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent Expenses</h3>
        {expenses.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Mode</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 10).map(expense => (
                  <tr key={expense.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{expense.description}</td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '0.8rem', 
                          color: '#fff',
                          background: CATEGORY_COLORS[expense.category] || '#64748b', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          textTransform: 'capitalize',
                          fontWeight: 500
                        }}
                      >
                        {expense.category}
                      </span>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontWeight: 600,
                          backgroundColor: PAYMENT_MODE_COLORS[expense.paymentMode || 'Cash']?.bg || 'rgba(100, 116, 139, 0.08)',
                          color: PAYMENT_MODE_COLORS[expense.paymentMode || 'Cash']?.color || 'var(--text-secondary)',
                          border: `1px solid ${PAYMENT_MODE_COLORS[expense.paymentMode || 'Cash']?.border || 'rgba(100, 116, 139, 0.2)'}`
                        }}
                      >
                        {expense.paymentMode || 'Cash'}
                      </span>
                    </td>
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
          </div>
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
