import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarClock, Pencil, X } from 'lucide-react';
import { SiNetflix, SiApple, SiSpotify, SiHbomax, SiCrunchyroll, SiOpenai } from 'react-icons/si';
import { FaAmazon, FaTv, FaYoutube, FaTwitch, FaXbox, FaPlaystation, FaPatreon, FaGithub } from 'react-icons/fa';

const API_URL = 'http://localhost:3001';

const BRAND_ICONS = {
  netflix: <SiNetflix color="#E50914" />,
  apple: <SiApple color="#000000" />,
  spotify: <SiSpotify color="#1DB954" />,
  prime: <FaAmazon color="#00A8E1" />,
  hulu: <FaTv color="#1CE783" />,
  disney: <FaTv color="#113CCF" />,
  youtube: <FaYoutube color="#FF0000" />,
  hbomax: <SiHbomax color="#5822B4" />,
  crunchyroll: <SiCrunchyroll color="#F47521" />,
  twitch: <FaTwitch color="#9146FF" />,
  xbox: <FaXbox color="#107C10" />,
  playstation: <FaPlaystation color="#003791" />,
  patreon: <FaPatreon color="#FF424D" />,
  github: <FaGithub color="#181717" />,
  chatgpt: <SiOpenai color="#10A37F" />
};

const getBrandKey = (brand) => {
  const normalized = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.includes('netflix')) return 'netflix';
  if (normalized.includes('apple')) return 'apple';
  if (normalized.includes('spotify')) return 'spotify';
  if (normalized.includes('prime') || normalized.includes('amazon')) return 'prime';
  if (normalized.includes('hulu')) return 'hulu';
  if (normalized.includes('disney')) return 'disney';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('hbo')) return 'hbomax';
  if (normalized.includes('crunchyroll')) return 'crunchyroll';
  if (normalized.includes('twitch')) return 'twitch';
  if (normalized.includes('xbox')) return 'xbox';
  if (normalized.includes('playstation') || normalized.includes('psplus')) return 'playstation';
  if (normalized.includes('patreon')) return 'patreon';
  if (normalized.includes('github')) return 'github';
  if (normalized.includes('chatgpt') || normalized.includes('openai')) return 'chatgpt';
  return brand;
};

function BrandIcon({ brand }) {
  const [error, setError] = useState(false);
  const key = getBrandKey(brand);
  
  if (BRAND_ICONS[key]) {
    return <span style={{ fontSize: '1.25rem', display: 'flex' }}>{BRAND_ICONS[key]}</span>;
  }
  
  if (error) {
    return <CalendarClock size={20} />;
  }
  
  return (
    <img 
      src={`https://logo.clearbit.com/${brand.toLowerCase().replace(/\s+/g, '')}.com`} 
      alt={brand}
      style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain' }}
      onError={() => setError(true)}
    />
  );
}

function Subscriptions({ token }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    brand: 'netflix',
    customBrand: '',
    amount: '',
    currency: '₹',
    billingDay: 1
  });

  useEffect(() => {
    fetchSubscriptions();
  }, [token]);

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
    setFormData({ brand: 'netflix', customBrand: '', amount: '', currency: '₹', billingDay: 1 });
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
              <select name="currency" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
                <option value="₹">INR (₹)</option>
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
                    {sub.currency}{sub.amount.toFixed(2)}/mo
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="delete-btn" onClick={() => startEdit(sub)} style={{ color: 'var(--text-primary)' }}><Pencil size={16} /></button>
                    <button className="delete-btn" onClick={() => deleteSub(sub.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
