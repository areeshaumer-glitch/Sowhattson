export function DataTable({
  columns, data, isLoading = false, emptyMessage = 'No results found.',
  onRowClick, rowKey = 'id',
  headerThStyle,
}) {
  return (
    <div style={{
      width: '100%',
      overflowX: 'auto',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '14px 24px',
                  textAlign: col.align || 'left',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  width: col.width,
                  background: 'var(--bg-card)',
                  ...headerThStyle,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '14px 24px' }}>
                    <div style={{
                      height: 14, borderRadius: 4,
                      background: 'var(--border)',
                      opacity: 0.6,
                      width: `${Math.random() * 40 + 40}%`,
                    }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row[rowKey] ?? idx}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: idx < data.length - 1 ? '1px solid var(--border)' : undefined,
                  cursor: onRowClick ? 'pointer' : undefined,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) e.currentTarget.style.background = '';
                }}
              >
                {columns.map((col) => {
                  const value = col.key.includes('.')
                    ? col.key.split('.').reduce((obj, k) => obj?.[k], row)
                    : row[col.key];
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: '14px 24px',
                        fontSize: 13.5,
                        color: 'var(--text-primary)',
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle',
                        maxWidth: 260,
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.render ? col.render(value, row) : value ?? '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
