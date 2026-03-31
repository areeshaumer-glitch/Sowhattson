import { BRAND_WORDMARK } from '../../constants/brand';
import logoPng from '../../assets/logo.png';

/**
 * @param {'light' | 'dark'} variant — light: auth cards; dark: sidebar on purple.
 * @param {boolean} showAdminLine — “Admin” / “Admin Panel” under the name.
 * @param {'h1' | 'p'} wordmarkAs — use `p` when the page has its own h1 (e.g. AuthShell).
 */
export function BrandWordmark({ variant = 'light', showAdminLine = true, wordmarkAs }) {
  const WordTag = wordmarkAs ?? (variant === 'light' ? 'h1' : 'p');
  if (variant === 'dark') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            flexShrink: 0,
            background: 'linear-gradient(90deg, #DCC8E8 0%, #EFE2C4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(102, 48, 123, 0.22)',
          }}
          aria-hidden
        >
          <img
            src={logoPng}
            alt=""
            style={{
              width: 28,
              height: 28,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.96)',
            lineHeight: 1.25,
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            {BRAND_WORDMARK}
          </p>
          {showAdminLine && (
            <p style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '5px 0 0',
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
