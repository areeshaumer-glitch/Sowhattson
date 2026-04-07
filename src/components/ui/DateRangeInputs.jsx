/** Match `Select` / toolbar dropdowns: height 42, 14px type, 1.5px border. */
const inputStyle = {
  boxSizing: 'border-box',
  height: 42,
  padding: '0 14px',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  minWidth: 148,
  minHeight: 42,
  outline: 'none',
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

const clearButtonStyle = {
  boxSizing: 'border-box',
  height: 42,
  padding: '0 16px',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/**
 * From / to date pickers for list and dashboard filters.
 * Values are YYYY-MM-DD strings (empty = no bound).
 */
export function DateRangeInputs({
  startDate = '',
  endDate = '',
  onChange,
  onClear,
  compact = false,
  idPrefix = 'dr',
}) {
  const setStart = (v) => onChange?.({ startDate: v, endDate });
  const setEnd = (v) => onChange?.({ startDate, endDate: v });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 10 : 12,
        flexWrap: 'wrap',
      }}
    >
      <label htmlFor={`${idPrefix}-from`} style={labelStyle}>
        From
      </label>
      <input
        id={`${idPrefix}-from`}
        type="date"
        value={startDate}
        onChange={(e) => setStart(e.target.value)}
        style={inputStyle}
      />
      <label htmlFor={`${idPrefix}-to`} style={labelStyle}>
        To
      </label>
      <input
        id={`${idPrefix}-to`}
        type="date"
        value={endDate}
        onChange={(e) => setEnd(e.target.value)}
        style={inputStyle}
        min={startDate || undefined}
      />
      {(startDate || endDate) && onClear ? (
        <button type="button" onClick={onClear} style={clearButtonStyle}>
          Clear dates
        </button>
      ) : null}
    </div>
  );
}

function toYmdLocal(ms) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive range on calendar days (YYYY-MM-DD); missing bound = open. */
export function isTimestampInDateRange(tsMs, startDayYmd, endDayYmd) {
  if (tsMs == null || Number.isNaN(Number(tsMs))) return true;
  const row = toYmdLocal(Number(tsMs));
  if (!row) return true;
  const s = String(startDayYmd ?? '').trim();
  const e = String(endDayYmd ?? '').trim();
  if (s && row < s) return false;
  if (e && row > e) return false;
  return true;
}
