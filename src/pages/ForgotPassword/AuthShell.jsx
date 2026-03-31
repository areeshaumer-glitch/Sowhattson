import { AuthBrandAside } from '../../components/auth/AuthBrandAside';

export function AuthShell({ children, title, subtitle }) {
  return (
    <div className="auth-split-wrap">
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 500, height: 500, borderRadius: '50%',
        background: 'var(--gradient)', opacity: 0.06, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 320, height: 320, borderRadius: '50%',
        background: 'var(--gradient)', opacity: 0.06, pointerEvents: 'none',
      }} />

      <div className="auth-split-card">
        <AuthBrandAside
          lines={[
            'Follow the steps to regain access to your admin account. We send a short code to your email so the reset stays secure.',
           
          ]}
        />
        <section className="auth-split-form">
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}>
            {title}
          </h1>
          {subtitle ? (
            <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.45 }}>
              {subtitle}
            </p>
          ) : null}

          {children}
        </section>
      </div>
    </div>
  );
}
