import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(
  ({ label, error, hint, icon, iconRight, containerStyle, type, style, ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...containerStyle }}>
        {label && (
          <label style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--text-secondary)',
          }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <span style={{
              position: 'absolute', left: 12,
              display: 'flex', color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            {...rest}
            style={{
              width: '100%',
              height: 42,
              padding: `0 ${(isPassword || iconRight) ? 40 : 14}px 0 ${icon ? 40 : 14}px`,
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'inherit',
              fontWeight: 500,
              outline: 'none',
              transition: 'border-color 0.18s, box-shadow 0.18s',
              ...style,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
              e.target.style.boxShadow = 'none';
              rest.onBlur?.(e);
            }}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 12,
                display: 'flex', color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {!isPassword && iconRight && (
            <span style={{ position: 'absolute', right: 12, display: 'flex', color: 'var(--text-muted)' }}>
              {iconRight}
            </span>
          )}
        </div>
        {error && <p style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 500 }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';


export const Textarea = forwardRef(
  ({ label, error, containerStyle, style, ...rest }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...containerStyle }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        {...rest}
        style={{
          width: '100%',
          minHeight: 90,
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'inherit',
          fontWeight: 500,
          outline: 'none',
          resize: 'vertical',
          transition: 'border-color 0.18s',
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && <p style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 500 }}>{error}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';
