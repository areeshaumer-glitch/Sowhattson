import { toast } from 'sonner';

export function notifySuccess(message) {
  const t = message != null ? String(message).trim() : '';
  if (t) toast.success(t);
}

export function notifyError(message) {
  const t = message != null ? String(message).trim() : '';
  if (t) toast.error(t);
}
