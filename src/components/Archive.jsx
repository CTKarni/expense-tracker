import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Wallet } from 'lucide-react';

const API_URL = 'http://localhost:3001';

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

function Archive({ token }) {
  const [archiveData, setArchiveData] = useState({});
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState('₹');
  const [exchangeRates, setExchangeRates] = useState({
    base: '₹',
    rates: { '₹': 1, '$': 83.3, '€': 90.5, '£': 105.2, '¥': 0.54 }
  });
  const [expandedMonths, setExpandedMonths] = useState({});

  useEffect(() => {
    fetchArchive();
    fetchExchangeRates();
  }, [token]);

  const fetchArchive = async () => {
    try {
      const res = await fetch(`${API_URL}/api/archive`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setArchiveData(await res.json());
      }
    } catch (err) {
      console.error('Error fetching archive', err);
    } finally {
      setLoading(false);
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
      console.warn('Backend exchange-rates API error or not configured. Using fallback.', err);
    }
  };

  const convertAmount = (amount, from, to) => {
    const rates = exchangeRates.rates;
    if (!rates) return amount;
    const inBase = amount * (rates[from] || 1);
    return inBase / (rates[to] || 1);
  };

  const toggleMonth = (monthLabel) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  // Convert the grouped archive data object to a sorted array
  const monthsArray = Object.entries(archiveData)
    .map(([monthLabel, expenses]) => {
      const total = expenses.reduce((sum, exp) => {
        return sum + convertAmount(exp.amount, exp.currency, displayCurrency);
      }, 0);

      // Sort by the first expense date to sort the months chronologically
      const latestDate = expenses[0] ? new Date(expenses[0].date) : new Date(0);

      return { monthLabel, expenses, total, latestDate };
    })
    .sort((a, b) => b.latestDate - a.latestDate);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', color: 'var(--text-secondary)' }}>
        Loading Archive...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Archive</h1>
          <p>Historical monthly expenses stored in the archive database</p>
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

      {monthsArray.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {monthsArray.map((item) => {
            const isExpanded = !!expandedMonths[item.monthLabel];
            return (
              <div 
                key={item.monthLabel} 
                className="card" 
                style={{ 
                  padding: '1.25rem 1.5rem', 
                  marginBottom: 0, 
                  cursor: 'pointer',
                  userSelect: 'none'
                }} 
                onClick={() => toggleMonth(item.monthLabel)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <Calendar size={18} color="var(--accent-primary)" />
                    {item.monthLabel}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                      Total: <strong style={{ color: 'var(--text-primary)' }}>{displayCurrency}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                  </div>
                </div>

                {isExpanded && (
                  <div 
                    style={{ 
                      marginTop: '1.25rem', 
                      borderTop: '1px solid var(--border-color)', 
                      paddingTop: '1rem',
                      cursor: 'default'
                    }} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Mode</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.expenses.map((expense) => {
                            const converted = convertAmount(expense.amount, expense.currency, displayCurrency);
                            const hasDifferentCurrency = expense.currency !== displayCurrency;

                            return (
                              <tr key={expense.id}>
                                <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
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
                                  {displayCurrency}{converted.toFixed(2)}
                                  {hasDifferentCurrency && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem', fontWeight: 400 }}>
                                      ({expense.currency}{expense.amount.toFixed(2)})
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Wallet size={36} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--accent-primary)' }} />
          <p style={{ fontWeight: 500, fontSize: '1rem' }}>No archived expenses found.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Previous months' expenses will appear here once archived from the Dashboard.</p>
        </div>
      )}
    </div>
  );
}

export default Archive;
