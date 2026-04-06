export const NAME_DISPLAY_MAX_LEN = 20;

/** Truncate for table cells; `title` is set when truncated (native tooltip). */
export function formatNameForCell(raw, maxLen = NAME_DISPLAY_MAX_LEN) {
  const t = String(raw ?? '').trim();
  if (!t) return { text: '—', title: undefined };
  if (t === '—') return { text: '—', title: undefined };
  const n = Number(maxLen);
  const limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : NAME_DISPLAY_MAX_LEN;
  if (t.length <= limit) return { text: t, title: undefined };
  return { text: `${t.slice(0, limit)}...`, title: t };
}
