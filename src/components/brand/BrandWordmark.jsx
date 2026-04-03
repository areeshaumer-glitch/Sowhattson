import { BRAND_WORDMARK } from '../../constants/brand';
import logoPng from '../../assets/logo.png';

/**
 * @param {'light' | 'dark'} variant — light: auth cards; dark: sidebar on purple.
 * @param {boolean} showAdminLine — “Admin” / “Admin Panel” under the name.
 * @param {'h1' | 'p'} wordmarkAs — use `p` when the page has its own h1 (e.g. AuthShell).
 * @param {boolean} compact — smaller type and logo (sidebar density).
 */
export function BrandWordmark({ variant = 'light', showAdminLine = true, wordmarkAs, compact = false }) {
  const WordTag = wordmarkAs ?? (variant === 'light' ? 'h1' : 'p');
  if (variant === 'dark') {
    const box = compact ? 34 : 44;
    const img = compact ? 22 : 28;
    const titleSize = compact ? 12.5 : 15;
    const subSize = compact ? 9 : 10.5;
    const gap = compact ? 8 : 12;
    const subMargin = compact ? '2px 0 0' : '5px 0 0';
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: box,
            height: box,
            borderRadius: compact ? 9 : 12,
            flexShrink: 0,
            background: 'linear-gradient(90deg, #DCC8E8 0%, #EFE2C4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: compact ? '0 2px 8px rgba(102, 48, 123, 0.18)' : '0 3px 12px rgba(102, 48, 123, 0.22)',
          }}
          aria-hidden
        >
          <img
            src={logoPng}
            alt=""
            style={{
              width: img,
              height: img,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.96)',
            lineHeight: compact ? 1.2 : 1.25,
            margin: 0,
            letterSpacing: compact ? '0.01em' : '0.02em',
          }}>
            {BRAND_WORDMARK}
          </p>
          {showAdminLine && (
            <p style={{
              fontSize: subSize,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: compact ? '0.06em' : '0.08em',
              textTransform: 'uppercase',
              margin: subMargin,
            }}>
              Admin Panel
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <WordTag style={{
        fontSize: 26,
        fontWeight: 500,
        color: 'var(--text-primary)',
        lineHeight: 1.25,
        margin: 0,
        letterSpacing: '0.03em',
      }}>
        {BRAND_WORDMARK}
      </WordTag>
      {showAdminLine && (
        <p style={{
          marginTop: 10,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-muted)',
        }}>
          Admin
        </p>
      )}
    </div>
  );
}
