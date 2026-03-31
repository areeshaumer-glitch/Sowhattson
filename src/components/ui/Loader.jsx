export const Loader = ({
  size = 32, color = 'var(--primary)', overlay = false, label,
}) => {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: size, height: size,
          border: `${size / 8}px solid rgba(102,48,123,0.15)`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      {label && <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(242,238,227,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}>
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      {spinner}
    </div>
  );
};

export const SkeletonRow = ({ cols = 5 }) => (
  <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} style={{
        flex: i === 0 ? '0 0 32px' : 1,
        height: 14, borderRadius: 4,
        background: 'var(--border)', opacity: 0.7,
      }} />
    ))}
  </div>
);
