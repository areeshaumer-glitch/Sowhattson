export const Card = ({
  children, style, padding = 20, onClick, hoverable = false,
}) => (
  <div
    onClick={onClick}
    style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding,
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid rgba(0,0,0,0.04)',
      transition: hoverable
        ? 'box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)'
        : undefined,
      cursor: onClick ? 'pointer' : undefined,
      ...style,
    }}
    onMouseEnter={hoverable ? (e) => {
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    } : undefined}
    onMouseLeave={hoverable ? (e) => {
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      e.currentTarget.style.transform = 'translateY(0)';
    } : undefined}
  >
    {children}
  </div>
);
