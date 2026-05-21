import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarClock, Pencil, X } from 'lucide-react';

const API_URL = 'http://localhost:3001';

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
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // CREATE
      const newSub = {
        id: crypto.randomUUID(),
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
        }
      } catch (err) {
        console.error(err);
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
        <h1>Recurring Subscriptions</h1>
        <p>Manage your monthly OTT and recurring bills without cluttering your daily expenses.</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Monthly Burn Rate</span>
          <div className="summary-value">{monthlyBurn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Active Subs</span>
          <div className="summary-value">{subscriptions.length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>{editingId ? 'Edit Subscription' : 'Add Subscription'}</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
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
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Your Subscriptions</h3>
        {subscriptions.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Billing Date</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}>
                        <BrandIcon brand={sub.brand} />
                        <span style={{ textTransform: 'capitalize' }}>{sub.brand}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>Every {sub.billingDay}{
                      sub.billingDay === 1 ? 'st' : sub.billingDay === 2 ? 'nd' : sub.billingDay === 3 ? 'rd' : 'th'
                    } of the month</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {(sub.currency || 'INR').length > 1 ? `${sub.currency || 'INR'} ` : (sub.currency || 'INR')}{sub.amount.toFixed(2)}/mo
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="delete-btn" onClick={() => startEdit(sub)} style={{ color: 'var(--text-primary)' }}><Pencil size={16} /></button>
                      <button className="delete-btn" onClick={() => deleteSub(sub.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <CalendarClock size={32} className="empty-icon" />
            <p>No active subscriptions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscriptions;
