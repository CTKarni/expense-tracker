import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarClock, Pencil, X, MoreHorizontal } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

const API_URL = `http://${window.location.hostname}:3001`;

// Extensible domain mapping for popular services
const BRAND_DOMAINS = {
  netflix: 'netflix.com',
  apple: 'apple.com',
  spotify: 'spotify.com',
  prime: 'primevideo.com',
  hulu: 'hulu.com',
  disney: 'disneyplus.com',
  youtube: 'youtube.com',
  hbomax: 'hbomax.com',
  hbo: 'hbo.com',
  crunchyroll: 'crunchyroll.com',
  twitch: 'twitch.tv',
  xbox: 'xbox.com',
  playstation: 'playstation.com',
  psplus: 'playstation.com',
  patreon: 'patreon.com',
  github: 'github.com',
  chatgpt: 'chatgpt.com',
  openai: 'openai.com',
  google: 'google.com',
  'google one': 'one.google.com',
  'googleone': 'one.google.com'
};

const getBrandDomain = (brand) => {
  const clean = brand.trim().toLowerCase();
  
  if (BRAND_DOMAINS[clean]) {
    return BRAND_DOMAINS[clean];
  }
  
  // Clean special characters and whitespace
  const key = clean.replace(/[^a-z0-9\s.-]/g, '');
  if (BRAND_DOMAINS[key]) {
    return BRAND_DOMAINS[key];
  }
  const collapsed = clean.replace(/[^a-z0-9.-]/g, '');
  if (BRAND_DOMAINS[collapsed]) {
    return BRAND_DOMAINS[collapsed];
  }

  // Already looks like a domain
  if (clean.includes('.') && !clean.startsWith('.') && !clean.endsWith('.')) {
    return clean;
  }
  
  // Fallback domain extension
  return `${collapsed || 'example'}.com`;
};

function BrandIcon({ brand }) {
  const domain = getBrandDomain(brand);
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  
  const [imgSrc, setImgSrc] = useState(clearbitUrl);
  const [hasFailedOnce, setHasFailedOnce] = useState(false);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  // Reset state if the brand changes
  useEffect(() => {
    setImgSrc(`https://logo.clearbit.com/${domain}`);
    setHasFailedOnce(false);
    setHasFailedAll(false);
  }, [brand, domain]);

  const handleError = () => {
    if (!hasFailedOnce) {
      setHasFailedOnce(true);
      setImgSrc(googleFaviconUrl);
    } else {
      setHasFailedAll(true);
    }
  };

  if (hasFailedAll) {
    return <CalendarClock size={20} style={{ color: 'var(--text-secondary)' }} />;
  }

  return (
    <img 
      src={imgSrc} 
      alt={brand}
      style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain', display: 'block' }}
      onError={handleError}
    />
  );
}

function Subscriptions({ token }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [currencies, setCurrencies] = useState({});
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [formData, setFormData] = useState({
    brand: 'netflix',
    customBrand: '',
    amount: '',
    currency: 'INR',
    billingDay: 1
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchCurrencies();
  }, [token]);

  const fetchCurrencies = async () => {
    try {
      const res = await fetch('https://api.frankfurter.app/currencies');
      if (res.ok) {
        const data = await res.json();
        setCurrencies(data);
      } else {
        throw new Error('Frankfurter response not OK');
      }
    } catch (err) {
      console.warn('Silently falling back to original 5 currencies as Frankfurter API fetch failed.', err);
      setCurrencies({
        USD: 'US Dollar',
        EUR: 'Euro',
        GBP: 'British Pound',
        INR: 'Indian Rupee',
        JPY: 'Japanese Yen'
      });
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSubscriptions(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.amount) return;
    
    const finalBrand = formData.brand === 'other' ? (formData.customBrand || 'Other') : formData.brand;
    
    if (editingId) {
      // UPDATE
      const updatedSub = {
        brand: finalBrand,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        billingDay: parseInt(formData.billingDay)
      };
      try {
        const res = await fetch(`${API_URL}/subscriptions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(updatedSub)
        });
        if (res.ok) {
          setSubscriptions(subscriptions.map(s => s.id === editingId ? { ...s, ...updatedSub } : s));
          resetForm();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to update subscription');
        }
      } catch (err) {
        console.error(err);
        setError(`Connection error: Failed to reach the server. ${err.message || ''}`);
      }
    } else {
      // CREATE
      const newSub = {
        id: generateUUID(),
        brand: finalBrand,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        billingDay: parseInt(formData.billingDay)
      };
      try {
        const res = await fetch(`${API_URL}/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newSub)
        });
        if (res.ok) {
          setSubscriptions([...subscriptions, newSub]);
          resetForm();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to add subscription');
        }
      } catch (err) {
        console.error(err);
        setError(`Connection error: Failed to reach the server. ${err.message || ''}`);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ brand: 'netflix', customBrand: '', amount: '', currency: 'INR', billingDay: 1 });
  };

  const startEdit = (sub) => {
    setEditingId(sub.id);
    const standardBrands = ['netflix', 'apple', 'spotify', 'prime', 'hulu', 'disney'];
    const isStandard = standardBrands.includes(sub.brand);
    setFormData({
      brand: isStandard ? sub.brand : 'other',
      customBrand: isStandard ? '' : sub.brand,
      amount: sub.amount,
      currency: sub.currency,
      billingDay: sub.billingDay
    });
  };

  const deleteSub = async (id) => {
    try {
      const res = await fetch(`${API_URL}/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSubscriptions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const monthlyBurn = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1 style={{ letterSpacing: '-0.02em' }}>Recurring Subscriptions</h1>
        <p>Manage your monthly OTT and recurring bills without cluttering your daily expenses.</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Monthly Burn Rate</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value" style={{ color: 'var(--text-primary)' }}>
            {monthlyBurn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-header-actions">
            <span className="summary-label">Active Subs</span>
            <MoreHorizontal size={18} className="card-dots" />
          </div>
          <div className="summary-value">{subscriptions.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header-actions">
          <h3 className="card-title">{editingId ? 'Edit Subscription' : 'Add Subscription'}</h3>
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
          <div className="form-group">
            <label>Brand</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select name="brand" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} style={{ flex: formData.brand === 'other' ? '0 0 40%' : '1' }}>
                <option value="netflix">Netflix</option>
                <option value="apple">Apple Music / TV</option>
                <option value="spotify">Spotify</option>
                <option value="prime">Amazon Prime</option>
                <option value="hulu">Hulu</option>
                <option value="disney">Disney+</option>
                <option value="other">Other</option>
              </select>
              {formData.brand === 'other' && (
                <input 
                  type="text" 
                  placeholder="e.g. HBO Max" 
                  value={formData.customBrand}
                  onChange={e => setFormData({...formData, customBrand: e.target.value})}
                  required
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Monthly Cost</label>
            <div className="amount-currency-group">
              <select 
                name="currency" 
                value={formData.currency} 
                onChange={e => setFormData({...formData, currency: e.target.value})}
                disabled={loadingCurrencies}
                className="currency-select"
                style={{ width: '130px' }}
              >
                {loadingCurrencies ? (
                  <option value="INR">Loading currencies...</option>
                ) : (
                  Object.entries(currencies).map(([code, name]) => (
                    <option key={code} value={code}>
                      {code} - {name}
                    </option>
                  ))
                )}
              </select>
              <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} step="0.01" min="0" required />
            </div>
          </div>
          <div className="form-group">
            <label>Billing Day (1-31)</label>
            <input type="number" value={formData.billingDay} onChange={e => setFormData({...formData, billingDay: e.target.value})} min="1" max="31" required />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button type="submit" className="primary-btn" style={{ flex: 1 }}>
              {editingId ? <Pencil size={18}/> : <Plus size={18}/>} 
              {editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="primary-btn" style={{ background: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header-actions">
          <h3 className="card-title">Your Subscriptions</h3>
          <MoreHorizontal size={18} className="card-dots" />
        </div>
        {subscriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {subscriptions.map(sub => (
              <div key={sub.id} className="transaction-row-item">
                <div className="transaction-icon-box" style={{ background: 'var(--bg-color)' }}>
                  <BrandIcon brand={sub.brand} />
                </div>
                <div className="transaction-details">
                  <span className="transaction-desc" style={{ textTransform: 'capitalize' }}>{sub.brand}</span>
                  <span className="transaction-date">
                    Every {sub.billingDay}{
                      sub.billingDay === 1 ? 'st' : sub.billingDay === 2 ? 'nd' : sub.billingDay === 3 ? 'rd' : 'th'
                    } of the month
                  </span>
                </div>
                <div className="transaction-amount-badge">
                  <span className="transaction-amount" style={{ color: 'var(--text-primary)' }}>
                    {(sub.currency || 'INR').length > 1 ? `${sub.currency || 'INR'} ` : (sub.currency || 'INR')}{sub.amount.toFixed(2)}/mo
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button 
                    className="delete-row-btn" 
                    onClick={() => startEdit(sub)} 
                    style={{ color: 'var(--text-primary)' }}
                    title="Edit subscription"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    className="delete-row-btn" 
                    onClick={() => deleteSub(sub.id)}
                    title="Delete subscription"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
            <CalendarClock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No active subscriptions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscriptions;
