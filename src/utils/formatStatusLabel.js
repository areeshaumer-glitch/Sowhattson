const SPECIAL = {
  canceled: 'Cancelled',
};

/**
 * Human-readable status for UI: capitalize words, underscores → spaces, common spelling fixes.
 */
/** Payment UI: show "In Progress" instead of "Pending" (value stays `pending`). */
export function formatPaymentStatusLabel(raw) {
  const lower = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (lower === 'pending') return 'In Progress';
  return formatStatusLabel(raw);
}

export function formatStatusLabel(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  const lower = s.toLowerCase().replace(/\s+/g, '_');
  if (SPECIAL[lower]) return SPECIAL[lower];

  return s
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const w = word.toLowerCase();
      if (SPECIAL[w]) return SPECIAL[w];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
