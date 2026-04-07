import { Fragment, useEffect, useState, Children, cloneElement, isValidElement } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const listPageTitleStyle = {
  fontSize: 26,
  fontWeight: 800,
  color: 'var(--text-primary)',
  lineHeight: 1.2,
  margin: 0,
  letterSpacing: '-0.02em',
};

/** narrow: <800px, medium: 800–1000px, wide: >1000px (toolbar layout only; app chrome still uses 1024). */
function getToolbarBreakpoint(innerWidth) {
  if (innerWidth < 800) return 'narrow';
  if (innerWidth <= 1000) return 'medium';
  return 'wide';
}

function useToolbarBreakpoint() {
  const [bp, setBp] = useState(() =>
    getToolbarBreakpoint(typeof window !== 'undefined' ? window.innerWidth : 1200),
  );
  useEffect(() => {
    const onResize = () => setBp(getToolbarBreakpoint(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

/** Search: drop maxWidth/flex caps so it can use full grid cell. */
function stretchMobileSearchChild(node) {
  if (!isValidElement(node)) return node;
  const props = node.props || {};
  return cloneElement(node, {
    style: {
      ...props.style,
      width: '100%',
      maxWidth: 'none',
      flex: 'none',
      minWidth: 0,
      boxSizing: 'border-box',
    },
  });
}

/** Fill the mobile filter column; pages often pass fixed widths (e.g. Select 180px) that leave empty space. */
function stretchMobileFilterChild(node) {
  if (!isValidElement(node)) return node;
  const props = node.props || {};
  const isSelect = node.type?.displayName === 'Select';
  if (isSelect) {
    return cloneElement(node, {
      style: { ...props.style, width: '100%', boxSizing: 'border-box' },
      containerStyle: { ...props.containerStyle, width: '100%', minWidth: 0 },
    });
  }
  return cloneElement(node, {
    style: { ...props.style, width: '100%', maxWidth: 'none', boxSizing: 'border-box' },
  });
}

/**
 * Register the current page title for the mobile app header (title left, menu right).
 * Call from any authenticated route child when the layout title should update.
 */
export function useMobileHeaderTitle(title) {
  const ctx = useOutletContext();
  const setMobilePageTitle = ctx?.setMobilePageTitle;
  const isMobile = ctx?.isMobile;

  useEffect(() => {
    if (!isMobile || !setMobilePageTitle) return;
    if (title) setMobilePageTitle(title);
    return () => setMobilePageTitle('');
  }, [isMobile, title, setMobilePageTitle]);
}

/**
 * One row: page title (left), flexible gap, then search/filters grouped at the end (+ optional actions).
 * On small screens: title is shown only in the app header; filters stay on one row below.
 * @param {boolean} [titleOwnRow] — Desktop only: title on the first line; all `children` on one row below (e.g. search + selects + date range).
 */
export function ListPageToolbar({ title, children, actions, titleOwnRow = false }) {
  const ctx = useOutletContext() ?? {};
  const { isMobile } = ctx;
  const toolbarBp = useToolbarBreakpoint();
  const childItems = Children.toArray(children).filter(Boolean);
  const [primaryControl, ...secondaryControls] = childItems;

  useMobileHeaderTitle(title || '');

  const actionsRow = actions ? (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
        alignItems: 'center',
      }}
    >
      {actions}
    </div>
  ) : null;

  // Compact chrome (<1024): layout by width tier; title stays in app header only.
  if (isMobile) {
    // >1000px & <1024px: same filter row behavior as desktop (no duplicate title).
    if (toolbarBp === 'wide') {
      return (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              width: '100%',
              justifyContent: 'flex-end',
            }}
          >
            {children}
          </div>
          {actionsRow}
        </div>
      );
    }

    // 800–1000px: search and filters equal width, one row.
    if (toolbarBp === 'medium') {
      return (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              width: '100%',
              alignItems: 'start',
            }}
          >
            <div style={{ minWidth: 0, width: '100%' }}>
              {primaryControl ? stretchMobileSearchChild(primaryControl) : null}
            </div>
            <div
              style={{
                minWidth: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {secondaryControls.map((ctrl, i) => (
                <div key={i} style={{ width: '100%', minWidth: 0 }}>
                  {stretchMobileFilterChild(ctrl)}
                </div>
              ))}
            </div>
          </div>
          {actionsRow}
        </div>
      );
    }

    // <800px: full-width search, then dropdown(s) in right half of second row.
    return (
      <div style={{ marginBottom: 16 }}>
        {primaryControl ? (
          <div style={{ width: '100%' }}>
            {stretchMobileSearchChild(primaryControl)}
          </div>
        ) : null}
        {secondaryControls.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginTop: 10,
              width: '100%',
              alignItems: 'start',
            }}
          >
            <div aria-hidden style={{ minWidth: 0 }} />
            <div
              style={{
                minWidth: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {secondaryControls.map((ctrl, i) => (
                <div key={i} style={{ width: '100%', minWidth: 0 }}>
                  {stretchMobileFilterChild(ctrl)}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {actionsRow}
      </div>
    );
  }

  if (titleOwnRow && title) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            width: '100%',
          }}
        >
          <h1 style={{ ...listPageTitleStyle, margin: 0, flexShrink: 0 }}>{title}</h1>
          {actions ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {actions}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            width: '100%',
            minWidth: 0,
            justifyContent: 'flex-end',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
      }}
    >
      {title ? <h1 style={{ ...listPageTitleStyle, flexShrink: 0 }}>{title}</h1> : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          flex: '1 1 200px',
          minWidth: 0,
          justifyContent: 'flex-end',
        }}
      >
        {children}
      </div>
      {actions ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Page title, subtitle, breadcrumbs, and row actions for the main content area. */
export const PageHeader = ({ title, subtitle, actions, breadcrumb }) => {
  const ctx = useOutletContext() ?? {};
  const { isMobile } = ctx;
  const hasHeading = (breadcrumb && breadcrumb.length > 0) || title || subtitle;

  useMobileHeaderTitle(title || '');

  if (isMobile && title) {
    return (
      <div style={{ marginBottom: 16 }}>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}>
            {breadcrumb.map((crumb, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronRight size={13} color="var(--text-muted)" />}
                <span style={{
                  fontSize: 12.5,
                  color: i === breadcrumb.length - 1 ? 'var(--text-muted)' : 'var(--primary)',
                  fontWeight: 500,
                  cursor: crumb.path ? 'pointer' : 'default',
                }}>
                  {crumb.label}
                </span>
              </Fragment>
            ))}
          </div>
        )}
        {subtitle && (
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
        {actions ? (
          <div className="list-toolbar-filters-mobile" style={{ justifyContent: 'flex-end' }}>
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  if (!hasHeading && actions) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
      }}>
        {actions}
      </div>
    );
  }

  if (!hasHeading && !actions) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', flexWrap: 'wrap',
      gap: 12, marginBottom: 24,
    }}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            marginBottom: 6,
          }}>
            {breadcrumb.map((crumb, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronRight size={13} color="var(--text-muted)" />}
                <span style={{
                  fontSize: 12.5,
                  color: i === breadcrumb.length - 1 ? 'var(--text-muted)' : 'var(--primary)',
                  fontWeight: 500,
                  cursor: crumb.path ? 'pointer' : 'default',
                }}>
                  {crumb.label}
                </span>
              </Fragment>
            ))}
          </div>
        )}
        {title && (
          <h1 style={listPageTitleStyle}>{title}</h1>
        )}
        {subtitle && (
          <p style={{ marginTop: 4, fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 500 }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
