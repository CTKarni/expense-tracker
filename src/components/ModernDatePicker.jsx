import { useState, useEffect, useRef } from 'react';

function ModernDatePicker({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value && value !== 'approximate') {
      return new Date(value);
    }
    return new Date();
  });

  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(prev => {
      const newMonth = prev.getMonth() - 1;
      const newYear = newMonth < 0 ? prev.getFullYear() - 1 : prev.getFullYear();
      const m = newMonth < 0 ? 11 : newMonth;
      return new Date(newYear, m, 1);
    });
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(prev => {
      const newMonth = prev.getMonth() + 1;
      const newYear = newMonth > 11 ? prev.getFullYear() + 1 : prev.getFullYear();
      const m = newMonth > 11 ? 0 : newMonth;
      return new Date(newYear, m, 1);
    });
  };

  const handleDaySelect = (day, e) => {
    e.stopPropagation();
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selected.getTimezoneOffset();
    const localDate = new Date(selected.getTime() - (offset * 60 * 1000));
    onChange(localDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  const isSelected = (day) => {
    if (!value || value === 'approximate') return false;
    const [vy, vm, vd] = value.split('-').map(Number);
    return vy === year && vm === (month + 1) && vd === day;
  };

  const formattedDisplay = () => {
    if (value === 'approximate') {
      return '❓ Date Unknown (Approximate)';
    }
    if (!value) return 'Select Date';
    const [vy, vm, vd] = value.split('-').map(Number);
    const dateObj = new Date(vy, vm - 1, vd);
    return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.65rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          background: disabled ? 'rgba(255, 255, 255, 0.03)' : 'var(--surface-color)',
          color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '38px',
          transition: 'all 0.2s',
          outline: 'none'
        }}
      >
        <span>{formattedDisplay()}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{isOpen && !disabled ? '▲' : '▼'}</span>
      </button>

      {isOpen && !disabled && (
        <div 
          className="calendar-dropdown"
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            zIndex: 999,
            width: '280px',
            padding: '1rem',
            borderRadius: '12px',
            background: 'var(--surface-color)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            color: 'var(--text-primary)',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', fontWeight: 'bold', fontSize: '1rem' }}
            >
              &lt;
            </button>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{months[month]} {year}</span>
            <button 
              type="button" 
              onClick={handleNextMonth} 
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', fontWeight: 'bold', fontSize: '1rem' }}
            >
              &gt;
            </button>
          </div>

          {/* Days of Week */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {daysOfWeek.map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarCells.map((day, idx) => (
              <div key={idx} style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {day ? (
                  <button
                    type="button"
                    onClick={(e) => handleDaySelect(day, e)}
                    style={{
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: '50%',
                      background: isSelected(day) ? 'var(--accent-primary)' : 'transparent',
                      color: isSelected(day) ? '#05140e' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: isSelected(day) ? 600 : 400,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected(day)) {
                        e.target.style.background = 'rgba(168, 230, 61, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected(day)) {
                        e.target.style.background = 'transparent';
                      }
                    }}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModernDatePicker;
