import { useEffect, Children, cloneElement, isValidElement, Fragment } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useMediaQuery } from '../../hooks/useMediaQuery';

function flattenFooterChildren(children) {
  const out = [];
  Children.forEach(children, (child) => {
    if (child == null || child === false) return;
    if (child.type === Fragment) {
      flattenFooterChildren(child.props.children).forEach((c) => out.push(c));
    } else {
      out.push(child);
    }
  });
  return out;
}

const sizeWidths = { sm: 420, md: 560, lg: 720, xl: 900 };

export const Modal = ({
  isOpen, onClose, title, children, footer, size = 'md', noPadding = false,
  compactHeader = false,
  /** When false, body does not scroll (e.g. image previews that should fit inside the panel). */
  scrollableBody = true,
  /** Max height of the modal panel (default leaves room for overlay padding). */
  panelMaxHeight = '90vh',
  /**
   * When true, panel height equals panelMaxHeight so the body flex region has a definite size.
   * Without this, content-sized panels can grow to max-height and overflow clips padding (e.g. image previews).
   */
  fillHeight = false,
}) => {
  const stackFooter = useMediaQuery('(max-width: 540px)');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: sizeWidths[size],
          ...(fillHeight
            ? { height: panelMaxHeight, maxHeight: panelMaxHeight }
            : { maxHeight: panelMaxHeight }),
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'modalIn 0.22s ease',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: compactHeader ? '10px 16px' : '18px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h2 style={{
            fontSize: compactHeader ? 16 : 17,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: compactHeader ? 1.25 : 1.3,
          }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32,
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          overflowY: scrollableBody ? 'auto' : 'hidden',
          overflowX: 'hidden',
          flex: '1 1 auto',
          minHeight: 0,
          padding: noPadding ? 0 : '20px 24px',
          ...(scrollableBody ? {} : { display: 'flex', flexDirection: 'column' }),
        }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: stackFooter ? '14px 16px' : '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: stackFooter ? 'column' : 'row',
              flexWrap: stackFooter ? 'nowrap' : 'wrap',
              justifyContent: stackFooter ? 'stretch' : 'flex-end',
              alignItems: stackFooter ? 'stretch' : 'center',
              gap: 10,
              flexShrink: 0,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {flattenFooterChildren(footer).map((child, i) =>
              isValidElement(child)
                ? cloneElement(child, {
                    key: child.key ?? `modal-footer-${i}`,
                    fullWidth: stackFooter,
                  })
                : child,
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConfirmModal = ({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', variant = 'danger', loading = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>
    }
  >
    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
  </Modal>
);
