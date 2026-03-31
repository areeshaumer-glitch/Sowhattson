import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(
  ({ label, error, options, placeholder, onChange, containerStyle, style, ...rest }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...containerStyle }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          ref={ref}
          {...rest}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            width: '100%',
            height: 42,
            padding: '0 36px 0 14px',
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            background: 'var(--bg-input)',
            color: rest.value === '' || rest.value === undefined ? 'var(--text-placeholder)' : 'var(--text-primary)',
            fontSize: 14,
            fontFamily: 'inherit',
            fontWeight: 500,
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.18s',
            ...style,
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
      </div>
      {error && <p style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 500 }}>{error}</p>}
    </div>
  ),
);
Select.displayName = 'Select';
