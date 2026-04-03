const options = [
  { label: 'Week',  value: 'weekly' },
  { label: 'Month', value: 'monthly' },
  { label: 'Year',  value: 'yearly' },
];

export const DateRangeFilter = ({ value, onChange }) => (
  <div style={{
    display: 'flex', gap: 2,
    background: 'var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 3,
  }}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: active ? 'var(--primary)' : 'transparent',
            color: active ? '#fff' : 'var(--text-secondary)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
