import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

const MOBILE_BREAKPOINT = 1024;

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobilePageTitle, setMobilePageTitleState] = useState('');
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );

  const setMobilePageTitle = useCallback((t) => {
    setMobilePageTitleState(typeof t === 'string' ? t : '');
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
        setMobilePageTitleState('');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const outletContext = useMemo(
    () => ({ setMobilePageTitle, isMobile }),
    [setMobilePageTitle, isMobile],
  );

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <Sidebar
        isOpen={!isMobile || sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        {isMobile && (
          <header
            style={{
              height: 'var(--topbar-height)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 12px 0 16px',
              background: 'var(--bg-topbar)',
              borderBottom: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
              zIndex: 40,
            }}
          >
            <h1
              style={{
                flex: 1,
                minWidth: 0,
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {mobilePageTitle || '\u00A0'}
            </h1>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Menu size={20} />
            </button>
          </header>
        )}
        <main
          data-app-scroll-main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '16px 16px 24px' : '28px 28px',
          }}
        >
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
};
