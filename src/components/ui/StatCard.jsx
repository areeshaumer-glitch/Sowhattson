import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  title, value, change, icon, gradient = false, suffix = '', loading = false,
  to, ariaLabel,
  /** Dashboard grid: unique key for coordinated hover */
  statKey,
  hoveredKey,
  onHoverEnter,
  /** Featured tile (Total Revenue): muted while another stat is hovered */
  featured = false,
}) => {
  const isPositive = (change ?? 0) >= 0;
  const trendColor = isPositive ? 'var(--success)' : 'var(--danger)';

  const dimmed = Boolean(gradient && featured && hoveredKey != null && hoveredKey !== statKey);
  const isHovered = Boolean(statKey != null && hoveredKey === statKey);
  const showLightFg = gradient && !dimmed;

  if (loading) {
    return (
      <div style={{
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[60, 40, 30].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? 14 : 22, width: `${w}%`, borderRadius: 4, background: 'var(--border)', opacity: 0.7 }} />
          ))}
        </div>
      </div>
    );
  }

  const surfaceClass = [
    'stat-card-surface',
    gradient && 'stat-card-surface--gradient',
    dimmed && 'stat-card-surface--gradient-muted',
    isHovered && !dimmed && 'stat-card-surface--hover-active',
  ].filter(Boolean).join(' ');

  const surface = (
    <div
      className={surfaceClass}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        overflow: 'hidden',
        background: !gradient ? 'var(--bg-card)' : undefined,
        boxShadow: gradient && !dimmed ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
        border: gradient && !dimmed ? 'none' : '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        animation: 'fadeIn 0.4s ease',
        height: '100%',
      }}
    >
      {gradient && (
        <div
          className="stat-card-gradient-fill"
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--stat-hover-gradient)',
            zIndex: 0,
          }}
        />
      )}
      {!gradient && (
        <div
          className="stat-card-gradient-fill stat-card-gradient-fill--plain-hover"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--stat-hover-gradient)',
            zIndex: 0,
          }}
          aria-hidden
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        <p className="stat-card-title">
          {title}
        </p>
        <p className="stat-card-value">
          {value}{suffix}
        </p>
        {change !== undefined && (
          <div className="stat-card-trend" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {change === 0
              ? <Minus size={13} color={trendColor} />
              : isPositive
              ? <TrendingUp size={13} color={trendColor} />
              : <TrendingDown size={13} color={trendColor} />}
            <span
              className="stat-card-trend-label"
              style={{
                fontSize: 12,
                color: showLightFg ? 'rgba(255,255,255,0.85)' : trendColor,
              }}
            >
              {isPositive && change !== 0 ? '+' : ''}{change?.toFixed(1)}% vs last period
            </span>
          </div>
        )}
      </div>
      <div className="stat-card-icon" style={{
        position: 'relative', zIndex: 1,
        width: 44, height: 44, flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: showLightFg ? 'rgba(255,255,255,0.2)' : 'var(--primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: showLightFg ? '#fff' : 'var(--primary)',
      }}>
        {icon}
      </div>
    </div>
  );

  const enterProps = statKey && onHoverEnter
    ? { onMouseEnter: () => onHoverEnter(statKey) }
    : {};

  if (to) {
    return (
      <Link
        to={to}
        className="stat-card-hit"
        aria-label={ariaLabel ?? `Open ${title}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block', minWidth: 0 }}
        {...enterProps}
      >
        {surface}
      </Link>
    );
  }

  if (statKey && onHoverEnter) {
    return (
      <div
        className="stat-card-hit"
        style={{ display: 'block', minWidth: 0 }}
        {...enterProps}
      >
        {surface}
      </div>
    );
  }

  return surface;
};
