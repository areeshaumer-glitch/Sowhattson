import { Menu } from 'lucide-react';

export const TopBar = ({ onMenuClick, isMobile, pageTitle }) => {
  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-topbar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        {isMobile && (
          <button
            type="button"
            onClick={onMenuClick}
            style={{
              width: 38, height: 38,
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-primary)',
              flexShrink: 0,
            }}
          >
            <Menu size={18} />
          </button>
        )}
        {pageTitle && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {pageTitle}
            </h1>
          </div>
        )}
      </div>
    </header>
  );
};
