import { Search, X } from 'lucide-react';

export const SearchBar = ({
  value, onChange, placeholder = 'Search…', style,
}) => (
  <div style={{ position: 'relative', ...style }}>
    <Search
      size={16}
      style={{
        position: 'absolute', left: 12, top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-muted)',
        pointerEvents: 'none',
      }}
    />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        height: 42,
        padding: `0 ${value ? 36 : 14}px 0 38px`,
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-input)',
        color: 'var(--text-primary)',
        fontSize: 13.5,
        fontFamily: 'inherit',
        fontWeight: 500,
        outline: 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--primary)';
        e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--border)';
        e.target.style.boxShadow = 'none';
      }}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        style={{
          position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', color: 'var(--text-muted)', padding: 2,
        }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);
