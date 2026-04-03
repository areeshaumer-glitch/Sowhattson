import { formatStatusLabel } from '../../utils/formatStatusLabel';

const colorMap = {
  success: { bg: 'var(--success-bg)', text: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  danger:  { bg: 'var(--danger-bg)',  text: 'var(--danger)' },
  info:    { bg: 'var(--info-bg)',    text: 'var(--info)' },
  primary: { bg: 'var(--primary-light)', text: 'var(--primary)' },
  neutral: { bg: 'rgba(108,108,112,0.12)', text: 'var(--text-secondary)' },
  /* Ended / voided — distinct from danger (errors) and info (refunds) */
  cancelled: { bg: 'rgba(117, 79, 128, 0.16)', text: '#6E4578' },
};

export const Badge = ({
  children,
  color = 'neutral',
  size = 'sm',
  dot = false,
  leading,
  style,
}) => {
  const { bg, text } = colorMap[color];
  const showDot = dot && !leading;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: bg,
        color: text,
        fontSize: size === 'sm' ? 11 : 12.5,
        fontWeight: 600,
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-full)',
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {leading ? (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'inherit' }}>{leading}</span>
      ) : showDot ? (
        <span
          style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: text,
            flexShrink: 0,
          }}
        />
      ) : null}
      {children}
    </span>
  );
};

export function statusColor(status) {
  const s = status?.toLowerCase();
  if (['active', 'confirmed', 'verified', 'success', 'visible', 'approved'].includes(s)) return 'success';
  if (['completed'].includes(s)) return 'neutral';
  if (['draft'].includes(s)) return 'primary';
  if (['pending', 'paused'].includes(s)) return 'warning';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['failed', 'rejected', 'deleted', 'suspended', 'hidden', 'flagged'].includes(s)) return 'danger';
  if (['refunded'].includes(s)) return 'info';
  return 'neutral';
}

/** Status cell: consistent colors + capitalized label site-wide. Pass `icon` to replace the dot (e.g. payment statuses). */
export function StatusBadge({ status, style, icon, formatLabel }) {
  const text = formatLabel ? formatLabel(status) : formatStatusLabel(status);
  return (
    <Badge color={statusColor(status)} dot={!icon} leading={icon} style={{ fontWeight: 500, ...style }}>
      {text}
    </Badge>
  );
}
