const styles = {
  primary: {
    background: 'var(--gradient)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 16px rgba(102,48,123,0.25)',
  },
  secondary: {
    background: 'var(--primary-light)',
    color: 'var(--primary)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1.5px solid var(--primary)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1.5px solid var(--border)',
  },
  danger: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '1px solid transparent',
  },
};

const sizeStyles = {
  sm: { height: 32, padding: '0 12px', fontSize: 12, borderRadius: 'var(--radius-sm)', gap: 6 },
  md: { height: 40, padding: '0 18px', fontSize: 13.5, borderRadius: 'var(--radius-md)', gap: 8 },
  lg: { height: 48, padding: '0 24px', fontSize: 15, borderRadius: 'var(--radius-md)', gap: 8 },
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  style,
  ...rest
}) => {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.18s, transform 0.12s',
        outline: 'none',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.55 : 1,
        ...styles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) e.currentTarget.style.opacity = '0.88';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) e.currentTarget.style.opacity = '1';
      }}
    >
      {loading ? (
        <span
          style={{
            width: 14, height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : icon}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  );
};
