import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  page, totalPages, total, limit, onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnStyle = (active, disabled) => ({
    minWidth: 34, height: 34,
    borderRadius: 'var(--radius-sm)',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 6px',
    transition: 'background 0.15s, color 0.15s',
    opacity: disabled ? 0.45 : 1,
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12, padding: '12px 0',
    }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{start}–{end}</strong> of{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> results
      </p>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button style={btnStyle(false, page === 1)} disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
          ) : (
            <button key={p} style={btnStyle(p === page)} onClick={() => p !== page && onPageChange(p)}>
              {p}
            </button>
          ),
        )}
        <button style={btnStyle(false, page === totalPages)} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
