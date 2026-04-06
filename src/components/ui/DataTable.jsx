export function DataTable({
  columns, data, isLoading = false, emptyMessage = 'No results found.',
  onRowClick, rowKey = 'id',
  headerThStyle,
  fixedLayout = false,
  minWidth = 560,
}) {
  /** Fixed layout + colgroup: every column has `width` and/or exactly one `fill` absorbs the rest. */
  const useColGroup =
    fixedLayout &&
    columns.length > 0 &&
    columns.every((c) => c.fill || c.width != null) &&
    columns.filter((c) => c.fill).length <= 1;

  const colWidthStyle = (col) => {
    if (col.fill || col.width == null) return undefined;
    return { width: typeof col.width === 'number' ? `${col.width}px` : col.width };
  };

  /** HTML width on <col> (plus style) — more reliable than style alone in some engines. */
  const colWidthAttr = (col) => {
    if (col.fill || col.width == null) return undefined;
    return typeof col.width === 'number' ? col.width : String(col.width).trim();
  };

  const widthIsPercent = (col) =>
    typeof col.width === 'string' && String(col.width).trim().endsWith('%');

  const cellMaxWidth = (col) => {
    if (col.fill) return undefined;
    if (col.maxWidth !== undefined) return col.maxWidth;
    if (!useColGroup) return col.width ? undefined : 260;
    if (col.width == null) return 260;
    if (widthIsPercent(col)) return undefined;
    return typeof col.width === 'number' ? `${col.width}px` : col.width;
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth,
          ...(fixedLayout ? { tableLayout: 'fixed' } : {}),
        }}
      >
        {useColGroup ? (
          <colgroup>
            {columns.map((col) =>
              col.fill ? (
                <col key={col.key} />
              ) : (
                <col key={col.key} width={colWidthAttr(col)} style={colWidthStyle(col)} />
              ),
            )}
          </colgroup>
        ) : null}
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
                  width: col.fill ? undefined : col.width,
                  maxWidth: cellMaxWidth(col),
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
                  const nowrap = col.wrap !== true;
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: '14px 24px',
                        fontSize: 13.5,
                        color: 'var(--text-primary)',
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle',
                        width: col.fill ? undefined : col.width,
                        maxWidth: cellMaxWidth(col),
                        minWidth: useColGroup ? 0 : undefined,
                        overflow: useColGroup ? 'hidden' : undefined,
                      }}
                    >
                      <div style={{
                        overflow: nowrap ? 'hidden' : undefined,
                        textOverflow: nowrap ? 'ellipsis' : undefined,
                        whiteSpace: nowrap ? 'nowrap' : 'normal',
                        wordBreak: col.wrap ? 'break-word' : undefined,
                      }}
                      >
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
