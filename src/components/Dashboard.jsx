import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ShoppingBag, CreditCard, Wallet, TrendingUp, TrendingDown, DollarSign, Archive, Utensils, Car, Clapperboard, FileText, HelpCircle, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';
import { generateUUID } from '../utils/uuid';

const API_URL = `http://${window.location.hostname}:3001`;

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
  const [error, setError] = useState(null);

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
    setError(null);
    if (!formData.description || !formData.amount || !formData.date) return;
    
    const newExpense = {
      id: generateUUID(),
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
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add expense');
      }
    } catch (err) {
      console.error('Error adding expense', err);
      setError(`Connection error: Failed to reach the server. ${err.message || ''}`);
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

  const handleArchivePreviousMonths = async () => {
    if (!window.confirm("Are you sure you want to archive expenses from previous months? This will move them to a separate archive database and remove them from this dashboard.")) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/archive/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully archived ${data.archivedCount} expenses!`);
        fetchExpenses();
      } else {
        const errData = await res.json();
        alert(`Failed to archive: ${errData.error}`);
      }
    } catch (err) {
      console.error('Error archiving expenses', err);
      alert('Error archiving expenses');
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const startOfCurrentMonth = `${currentYear}-${currentMonth}-01`;
  const hasPreviousMonthsExpenses = expenses.some(exp => exp.date < startOfCurrentMonth);

  const totalIncomeConverted = incomes.reduce((sum, inc) => {
    return sum + convertAmount(inc.amount, inc.currency, displayCurrency);
  }, 0);

  const netSavings = totalIncomeConverted - totalExpensesConverted;
  const savingsRate = totalIncomeConverted > 0 ? (netSavings / totalIncomeConverted) * 100 : 0;

  // Calculate actual month-over-month statistics
  const currentYr = now.getFullYear();
  const currentMth = now.getMonth(); // 0-indexed
  
  const startOfThisMonth = new Date(currentYr, currentMth, 1);
  const startOfNextMonth = new Date(currentYr, currentMth + 1, 1);
  const startOfLastMonth = new Date(currentYr, currentMth - 1, 1);

  // Helper to filter and sum amounts converted to display currency
  const getSumForPeriod = (items, startDate, endDate) => {
    return items
      .filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate < endDate;
      })
      .reduce((sum, item) => sum + convertAmount(item.amount, item.currency, displayCurrency), 0);
  };

  const getCountForPeriod = (items, startDate, endDate) => {
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate < endDate;
    }).length;
  };

  const thisMonthExpenses = getSumForPeriod(expenses, startOfThisMonth, startOfNextMonth);
  const thisMonthIncome = getSumForPeriod(incomes, startOfThisMonth, startOfNextMonth);
  const thisMonthExpensesCount = getCountForPeriod(expenses, startOfThisMonth, startOfNextMonth);

  const lastMonthExpenses = getSumForPeriod(expenses, startOfLastMonth, startOfThisMonth);
  const lastMonthIncome = getSumForPeriod(incomes, startOfLastMonth, startOfThisMonth);

  const calculateChangePercent = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const expensesChangePercent = calculateChangePercent(thisMonthExpenses, lastMonthExpenses);
  const incomeChangePercent = calculateChangePercent(thisMonthIncome, lastMonthIncome);

  const thisMonthSavings = thisMonthIncome - thisMonthExpenses;
  const lastMonthSavings = lastMonthIncome - lastMonthExpenses;
  const savingsChangePercent = calculateChangePercent(thisMonthSavings, lastMonthSavings);

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

  const getBiggestCategory = () => {
    if (donutData.length === 0) return { name: 'None', value: 0, percent: 0 };
    const sorted = [...donutData].sort((a, b) => b.value - a.value);
    const biggest = sorted[0];
    const percent = totalDonutValue > 0 ? (biggest.value / totalDonutValue) * 100 : 0;
    return { name: biggest.name, value: biggest.value, percent };
  };

  const biggestCategory = getBiggestCategory();

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'food': return <Utensils size={18} style={{ color: 'var(--accent-danger)' }} />;
      case 'travel': return <Car size={18} style={{ color: '#f59e0b' }} />;
      case 'shopping': return <ShoppingBag size={18} style={{ color: '#3b82f6' }} />;
      case 'entertainment': return <Clapperboard size={18} style={{ color: '#ec4899' }} />;
      case 'utilities': return <FileText size={18} style={{ color: '#10b981' }} />;
      default: return <HelpCircle size={18} style={{ color: '#8b5cf6' }} />;
    }
  };

  const getCategoryBgColor = (category) => {
    switch (category) {
      case 'food': return 'rgba(239, 68, 68, 0.08)';
      case 'travel': return 'rgba(245, 158, 11, 0.08)';
      case 'shopping': return 'rgba(59, 130, 246, 0.08)';
      case 'entertainment': return 'rgba(236, 72, 153, 0.08)';
      case 'utilities': return 'rgba(16, 185, 129, 0.08)';
      default: return 'rgba(139, 92, 246, 0.08)';
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p>An any way to manage expenses with care and precision.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {hasPreviousMonthsExpenses && (
            <button 
              onClick={handleArchivePreviousMonths}
              className="primary-btn"
              style={{ 
                height: '38px', 
                padding: '0 1rem', 
                fontSize: '0.85rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                borderRadius: '20px'
              }}
            >
              <Archive size={15} /> Archive Previous Months
            </button>
          )}

          {/* Date Selector Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            padding: '0.45rem 1rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer'
          }}>
            <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
            <span>{startOfThisMonth.toLocaleDateString(undefined, {month: 'short', year: 'numeric'})} - {now.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>▼</span>
          </div>

          {/* Currency Controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select 
              value={displayCurrency} 
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="currency-select"
              style={{ width: '110px' }}
            >
              <option value="₹">INR (₹)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="¥">JPY (¥)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main SaaS Responsive Grid */}
      <div className="dashboard-layout-grid">
        {/* Left Area */}
        <div className="dashboard-left-col">
          {/* Summary Cards Grid */}
          <div className="summary-grid">
            {/* Income Card */}
            <div className="summary-card">
              <div className="card-header-actions">
                <span className="summary-label">Total Income</span>
                <MoreHorizontal size={18} className="card-dots" />
              </div>
              <div className="summary-value" style={{ color: 'var(--text-primary)' }}>
                {displayCurrency}{totalIncomeConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                marginTop: '0.75rem',
                color: incomeChangePercent >= 0 ? '#10b981' : '#ef4444'
              }}>
                {incomeChangePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{incomeChangePercent >= 0 ? '+' : ''}{incomeChangePercent.toFixed(1)}%</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>from last month</span>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="summary-card">
              <div className="card-header-actions">
                <span className="summary-label">Total Expenses</span>
                <MoreHorizontal size={18} className="card-dots" />
              </div>
              <div className="summary-value" style={{ color: 'var(--text-primary)' }}>
                {displayCurrency}{totalExpensesConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                marginTop: '0.75rem',
                color: expensesChangePercent <= 0 ? '#10b981' : '#ef4444' // lower expenses is good (green)
              }}>
                {expensesChangePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{expensesChangePercent >= 0 ? '+' : ''}{expensesChangePercent.toFixed(1)}%</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>from last month</span>
              </div>
            </div>

            {/* Savings Card */}
            <div className="summary-card">
              <div className="card-header-actions">
                <span className="summary-label">Net Savings</span>
                <MoreHorizontal size={18} className="card-dots" />
              </div>
              <div className="summary-value" style={{ color: netSavings >= 0 ? '#10b981' : '#ef4444' }}>
                {netSavings >= 0 ? '+' : ''}{displayCurrency}{netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                marginTop: '0.75rem',
                color: savingsChangePercent >= 0 ? '#10b981' : '#ef4444'
              }}>
                {savingsChangePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{savingsChangePercent >= 0 ? '+' : ''}{savingsChangePercent.toFixed(1)}%</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>from last month</span>
              </div>
            </div>
          </div>

          {/* Cards Rows */}
          <div className="dashboard-sub-grid">
            {/* Recent Transactions List */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header-actions">
                <h3 className="card-title">Recent Transactions</h3>
                <MoreHorizontal size={18} className="card-dots" />
              </div>
              {expenses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {expenses.slice(0, 5).map(expense => (
                    <div key={expense.id} className="transaction-row-item">
                      <div className="transaction-icon-box" style={{ background: getCategoryBgColor(expense.category) }}>
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div className="transaction-details">
                        <span className="transaction-desc">{expense.description}</span>
                        <span className="transaction-date">{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="transaction-amount-badge">
                        <span className="transaction-amount" style={{ color: 'var(--text-primary)' }}>
                          -{expense.currency}{expense.amount.toFixed(2)}
                        </span>
                        <span 
                          className="transaction-badge" 
                          style={{
                            backgroundColor: PAYMENT_MODE_COLORS[expense.paymentMode || 'Cash']?.bg || 'rgba(100, 116, 139, 0.08)',
                            color: PAYMENT_MODE_COLORS[expense.paymentMode || 'Cash']?.color || 'var(--text-secondary)',
                            border: `1px solid ${PAYMENT_MODE_COLORS[expense.paymentMode || 'Cash']?.border || 'rgba(100, 116, 139, 0.2)'}`
                          }}
                        >
                          {expense.paymentMode || 'Cash'}
                        </span>
                      </div>
                      <button className="delete-row-btn" onClick={() => deleteExpense(expense.id)} title="Delete transaction">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                  <Wallet size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem' }}>No expenses logged yet.</p>
                </div>
              )}
            </div>

            {/* Income vs Expenses Bar Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
              <div className="card-header-actions">
                <h3 className="card-title">Income vs Expenses Balance</h3>
                <MoreHorizontal size={18} className="card-dots" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', flex: 1, padding: '1.25rem 0' }}>
                <svg width={chartWidth} height={chartHeight + 30} style={{ overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="var(--border-color)" strokeWidth="1.5" />
                  <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
                  <line x1="0" y1={chartHeight / 4} x2={chartWidth} y2={chartHeight / 4} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
                  <line x1="0" y1={(chartHeight * 3) / 4} x2={chartWidth} y2={(chartHeight * 3) / 4} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.4" />

                  {/* Income Capsule Track */}
                  <rect x="45" y="0" width="30" height={chartHeight} fill="var(--bg-color)" rx="8" />
                  {/* Income Bar (Deep Forest Green) */}
                  <rect
                    x="45"
                    y={chartHeight - incomeBarHeight}
                    width="30"
                    height={incomeBarHeight}
                    fill="#1a4d2e"
                    rx="8"
                    style={{ transition: 'height 0.4s, y 0.4s' }}
                  />
                  <text x="60" y={chartHeight - incomeBarHeight - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700">
                    {displayCurrency}{totalIncomeConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                  <text x="60" y={chartHeight + 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="600">
                    Income
                  </text>

                  {/* Expense Capsule Track */}
                  <rect x="145" y="0" width="30" height={chartHeight} fill="var(--bg-color)" rx="8" />
                  {/* Expense Bar (Lime Green) */}
                  <rect
                    x="145"
                    y={chartHeight - expenseBarHeight}
                    width="30"
                    height={expenseBarHeight}
                    fill="#a8e63d"
                    rx="8"
                    style={{ transition: 'height 0.4s, y 0.4s' }}
                  />
                  <text x="160" y={chartHeight - expenseBarHeight - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700">
                    {displayCurrency}{totalExpensesConverted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                  <text x="160" y={chartHeight + 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="600">
                    Expense
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Budgets & Form Row */}
          <div className="dashboard-sub-grid">
            {/* Category Targets */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header-actions">
                <h3 className="card-title">Monthly Budget Targets</h3>
                {isEditingBudgets ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={saveBudgets} 
                      className="primary-btn"
                      style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 600 }}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => { setTempBudgets(customBudgets); setIsEditingBudgets(false); }} 
                      style={{ padding: '0 8px', height: '28px', fontSize: '0.75rem', background: 'var(--border-color)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingBudgets(true)} 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '20px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Edit Limits
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {budgetList.map(budget => (
                  <div key={budget.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 500 }}>
                      <span style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CATEGORY_COLORS[budget.category] }}></span>
                        {budget.category}
                      </span>
                      {isEditingBudgets ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{displayCurrency}{budget.spent.toFixed(0)}</strong> / ₹
                          </span>
                          <input 
                            type="number" 
                            value={tempBudgets[budget.category] === undefined ? '' : tempBudgets[budget.category]} 
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                              setTempBudgets(prev => ({ ...prev, [budget.category]: val }));
                            }}
                            style={{ width: '60px', padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                            min="0"
                          />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{displayCurrency}{budget.spent.toFixed(0)}</strong> / {displayCurrency}{budget.limit.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(100, budget.ratio)}%`, 
                          background: budget.ratio > 100 ? 'var(--accent-danger)' : budget.ratio > 80 ? 'orange' : '#1a4d2e', 
                          transition: 'width 0.4s, background-color 0.4s' 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Add Expense Form */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header-actions">
                <h3 className="card-title">Quick Add Expense</h3>
                <MoreHorizontal size={18} className="card-dots" />
              </div>
              <form className="form-grid" onSubmit={handleExpenseSubmit} style={{ gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {error && (
                  <div style={{
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
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>Description</label>
                  <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g. Starbucks Coffee" required style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                </div>
                <div className="form-row-2col-split">
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Amount</label>
                    <div className="amount-currency-group">
                      <select name="currency" value={formData.currency} onChange={handleInputChange} style={{ width: '60px', padding: '0.5rem 0.25rem', fontSize: '0.85rem' }}>
                        <option value="$">$</option>
                        <option value="€">€</option>
                        <option value="£">£</option>
                        <option value="₹">₹</option>
                        <option value="¥">¥</option>
                      </select>
                      <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} step="0.01" min="0" required style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} style={{ padding: '0.5rem 0.5rem', fontSize: '0.85rem' }}>
                      <option value="food">Food</option>
                      <option value="travel">Travel</option>
                      <option value="shopping">Shopping</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="utilities">Utilities</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Date</label>
                    <ModernDatePicker
                      value={formData.date}
                      onChange={date => setFormData(prev => ({ ...prev, date }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem' }}>Mode</label>
                    <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange} style={{ padding: '0.5rem 0.5rem', fontSize: '0.85rem' }}>
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button type="submit" className="primary-btn" style={{ width: '100%', height: '36px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16}/> Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Sidebar Area */}
        <div className="dashboard-right-col">
          {/* Donut Chart Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'auto', marginBottom: 0 }}>
            <div className="card-header-actions">
              <h3 className="card-title">Category Breakdown</h3>
              <MoreHorizontal size={18} className="card-dots" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
              {donutData.length > 0 ? (
                <>
                  <svg width="150" height="150" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
                    {donutSlices}
                    {/* Center hole stats */}
                    <circle cx="60" cy="60" r="32" fill="var(--surface-color)" />
                    <text x="60" y="52" textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontWeight="600" style={{ letterSpacing: '0.05em' }}>
                      TOP CATEGORY
                    </text>
                    <text x="60" y="67" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="800" style={{ textTransform: 'uppercase' }}>
                      {biggestCategory.name}
                    </text>
                    <text x="60" y="79" textAnchor="middle" fill="var(--accent-danger)" fontSize="8" fontWeight="700">
                      {biggestCategory.percent.toFixed(0)}% of spent
                    </text>
                  </svg>
                  
                  {/* Legend list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', padding: '0 0.5rem' }}>
                    {donutData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></div>
                          <span style={{ textTransform: 'capitalize', fontWeight: 500, color: 'var(--text-primary)' }}>{d.name}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {displayCurrency}{d.value.toFixed(0)} <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>({((d.value / totalDonutValue) * 100).toFixed(0)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0', width: '100%' }}>
                  Log expenses to see category breakdowns.
                </div>
              )}
            </div>
          </div>

          {/* Dark Green Motivation/Update Card */}
          <div className="update-card">
            <span className="update-card-badge">Update</span>
            <h4 className="update-card-title">Expense Summary</h4>
            <p className="update-card-desc">
              You've logged <strong>{thisMonthExpensesCount}</strong> expenses this month.
              {thisMonthExpenses > 0 ? (
                <> Total spent this month is <strong>{displayCurrency}{thisMonthExpenses.toFixed(0)}</strong>.</>
              ) : (
                <> Start logging your expenses to stay on top of your financial budget!</>
              )}
            </p>
            <div className="update-card-link" onClick={() => window.location.pathname = '/archive'}>
              See Statistics &gt;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
