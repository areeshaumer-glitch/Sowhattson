import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Ticket, Store, Users,
  Tag, Zap, Star, CreditCard, Settings, LogOut, X,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { BrandWordmark } from '../brand/BrandWordmark';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={18} />, end: true },
  { to: '/experiences', label: 'Experiences', icon: <CalendarDays size={18} /> },
  { to: '/tickets',   label: 'Tickets',    icon: <Ticket size={18} /> },
  { to: '/providers', label: 'Providers',  icon: <Store size={18} /> },
  { to: '/explorers', label: 'Explorers',  icon: <Users size={18} /> },
  { to: '/tags',      label: 'Tags',       icon: <Tag size={18} /> },
  // { to: '/vibes',     label: 'Vibes',      icon: <Zap size={18} /> },
  { to: '/reviews',   label: 'Reviews',    icon: <Star size={18} /> },
  { to: '/payments',  label: 'Payments',   icon: <CreditCard size={18} /> },
  { to: '/settings',  label: 'Settings',   icon: <Settings size={18} /> },
];

export const Sidebar = ({ isOpen, onClose, isMobile }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      <aside
        style={{
          position: isMobile ? 'fixed' : 'sticky',
          top: 0, left: 0,
          height: '100dvh',
          width: 'var(--sidebar-width)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 100,
          transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div style={{
          padding: '22px 18px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <BrandWordmark variant="dark" />
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              <X size={18} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
         
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => { if (isMobile) onClose(); }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 11,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 2,
                textDecoration: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.15s',
                background: isActive ? undefined : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'var(--gradient)',
                      borderRadius: 'var(--radius-md)',
                      zIndex: 0,
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative', zIndex: 1 }}>
                    {item.icon}
                    {item.label}
                  </div>
                  {isActive && (
                    <ChevronRight size={14} style={{ position: 'relative', zIndex: 1, opacity: 0.8 }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {/* {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px 14px',
            }}>
              <div style={{
                width: 34, height: 34,
                borderRadius: '50%',
                background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {user.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </p>
              </div>
            </div>
          )} */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(234,84,85,0.12)',
              border: 'none', cursor: 'pointer',
              color: 'rgba(238, 232, 232, 0.92)',
              fontSize: 13.5, fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(234,84,85,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(234,84,85,0.12)')}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
