import { toast } from 'sonner';

/** Stable id so the same message replaces an existing toast (avoids double toasts from Strict Mode / parallel failures). */
function toastDedupeId(kind, message) {
  const t = String(message ?? '').trim();
  return `${kind}:${t.slice(0, 160)}`;
}

export function notifySuccess(message) {
  const t = message != null ? String(message).trim() : '';
  if (t) toast.success(t, { id: toastDedupeId('success', t) });
}

export function notifyError(message) {
  const t = message != null ? String(message).trim() : '';
  if (t) toast.error(t, { id: toastDedupeId('error', t) });
}
