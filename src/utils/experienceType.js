/**
 * Shared rules for experience type on list + detail so labels and recurrence match.
 */

/** Mock list row index `i` (id = i + 1) — detail mock must use the same index. */
export const MOCK_EXPERIENCE_STATUSES = Object.freeze([
  'active', 'active', 'completed', 'active', 'active', 'paused',
  'active', 'active', 'completed', 'active', 'active', 'paused',
  'active', 'active', 'completed',
]);

/**
 * Canonical experience status slug for table + detail (same fields, lowercase + underscores).
 */
export function getExperienceStatus(row) {
  if (!row || typeof row !== 'object') return '';
  const raw =
    row.status ??
    row.eventStatus ??
    row.event_status ??
    row.state ??
    row.lifecycleStatus ??
    row.lifecycle_status;
  if (raw == null || String(raw).trim() === '') return '';
  return String(raw).trim().toLowerCase().replace(/\s+/g, '_');
}

export function getExperienceTypeRaw(row) {
  if (!row || typeof row !== 'object') return '';
  const v =
    row.experienceType ??
    row.experience_type ??
    row.type ??
    row.eventType ??
    row.event_type ??
    row.recurrence;
  return v == null ? '' : v;
}

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
}

const ONE_TIME_ALIASES = new Set([
  'one_time',
  'onetime',
  'one_off',
  'once',
  'single',
  'non_recurring',
  'nonrecurring',
  'oneoff',
]);

const RECURRING_ALIASES = new Set(['recurring', 'series', 'weekly', 'monthly', 'daily']);

/**
 * Whether the row represents a recurring experience (same meaning as list column + detail Type).
 */
export function isExperienceRecurring(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.isRecurring === true || row.is_recurring === true) return true;
  if (row.isRecurring === false || row.is_recurring === false) return false;

  const raw = norm(getExperienceTypeRaw(row));
  if (RECURRING_ALIASES.has(raw)) return true;
  if (ONE_TIME_ALIASES.has(raw)) return false;

  const kind = norm(row.recurrenceKind ?? row.recurrenceType ?? row.scheduleType ?? row.recurrence_pattern);
  if (['weekly', 'monthly', 'daily'].includes(kind)) return true;

  if (row.recurrenceRule || row.rrule || row.recurrence_rule) return true;

  return false;
}

/** Label shown in DataTable "Experience type" and detail "Type" row. */
export function formatExperienceTypeLabel(row) {
  if (!row || typeof row !== 'object') return 'One time';
  if (row.experienceType === 'recurring') return 'Recurring';
  if (row.experienceType === 'one_time') return 'One time';
  return isExperienceRecurring(row) ? 'Recurring' : 'One time';
}

/**
 * weekly | monthly when recurring; null when one-time.
 */
export function inferRecurrenceKind(row, recurring) {
  if (!recurring) return null;
  const explicit = norm(row.recurrenceKind ?? row.recurrenceType ?? row.scheduleType ?? row.recurrence_pattern);
  if (explicit === 'weekly' || explicit === 'monthly' || explicit === 'daily') {
    return explicit === 'daily' ? 'weekly' : explicit;
  }
  const raw = norm(getExperienceTypeRaw(row));
  if (raw === 'weekly') return 'weekly';
  if (raw === 'monthly') return 'monthly';
  if (raw === 'daily') return 'weekly';
  return 'monthly';
}
