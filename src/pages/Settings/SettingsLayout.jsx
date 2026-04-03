import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { User, Key } from 'lucide-react';
import { useMobileHeaderTitle } from '../../components/ui/PageHeader';

const SUB_NAV = [
  { to: '/settings/profile', label: 'My Profile', Icon: User },
  { to: '/settings/password', label: 'Change Password', Icon: Key },
];

export default function SettingsLayout() {
  const parentCtx = useOutletContext() ?? {};
  const { isMobile } = parentCtx;
  useMobileHeaderTitle('Settings');

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {!isMobile && (
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
          margin: '0 0 22px',
          letterSpacing: '-0.02em',
        }}>
          Settings
        </h1>
      )}
      <div className="settings-body-grid">
        <aside style={{
          width: '100%',
          minWidth: 0,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: '18px 14px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SUB_NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end style={{ display: 'block', textDecoration: 'none' }}>
                {({ isActive }) => (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                    background: isActive ? 'var(--primary-light)' : 'var(--bg-input)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                    <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div style={{ minWidth: 0, minHeight: 200 }}>
          <Outlet context={parentCtx} />
        </div>
      </div>
    </div>
  );
}
