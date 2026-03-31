const HTML_LIKE = /<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]|<\/html>/i;

function looksLikeHtml(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 8) return false;
  if (HTML_LIKE.test(t)) return true;
  return t.includes('<pre>') && t.includes('</pre>') && t.includes('Cannot ');
}

/** Backend often echoes routes or stack-ish text — never show that to admins in UI. */
function looksLikeTechnicalServerMessage(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length > 600) return true;
  const lower = t.toLowerCase();
  if (lower.includes('/api/')) return true;
  if (/cannot\s+(get|post|put|patch|delete)\s+\//i.test(t)) return true;
  if (lower.includes('request failed with status code')) return true;
  if (lower.includes('axioserror') || lower.includes('network error')) return true;
  if (lower.includes('econnrefused') || lower.includes('enotfound')) return true;
  if (lower.includes('at ') && lower.includes('.js:')) return true;
  return false;
}

function pickSafeStringMessage(err) {
  if (typeof err !== 'object' || err == null) return '';
  const candidates = [err.message, err.error, err.msg, err.detail];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (!t || looksLikeHtml(t) || looksLikeTechnicalServerMessage(t)) continue;
      if (t.length <= 500) return t;
    }
  }
  if (Array.isArray(err.errors)) {
    const first = err.errors.find((e) => typeof e === 'string' && e.trim());
    if (first) return String(first).trim();
  }
  return '';
}

function messageForHttpStatus(status) {
  switch (status) {
    case 400:
      return 'Please check your details and try again.';
    case 401:
      return 'Sign-in failed. Check your email and password.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "That action isn't available right now. Please try again later or contact support.";
    case 408:
      return 'The request took too long. Please try again.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The server is having trouble. Please try again in a few minutes.';
    default:
      return '';
  }
}

function genericMessage() {
  return 'Something went wrong. Please try again.';
}

/**
 * Turns API/axios failures into short, safe copy for UI (never raw HTML).
 * @param {*} err - response.data, AxiosError, Error, or string
 * @param {number} [httpStatus] - optional status when err is body only
 */
export function getApiErrorMessage(err, httpStatus) {
  if (err == null) return genericMessage();

  if (typeof err === 'object' && err.isAxiosError) {
    const status = err.response?.status;
    const data = err.response?.data;
    if (data !== undefined && data !== null && data !== '') {
      return getApiErrorMessage(data, status);
    }
    return messageForHttpStatus(status) || 'Could not reach the server. Check your connection and try again.';
  }

  if (typeof err === 'string') {
    const s = err.trim();
    if (!s) return genericMessage();
    if (looksLikeHtml(s) || looksLikeTechnicalServerMessage(s)) {
      return messageForHttpStatus(httpStatus) || genericMessage();
    }
    if (s.length > 500) {
      return messageForHttpStatus(httpStatus) || genericMessage();
    }
    return s;
  }

  if (typeof err === 'object') {
    const safe = pickSafeStringMessage(err);
    if (safe) return safe;
    if (httpStatus != null) {
      const byStatus = messageForHttpStatus(httpStatus);
      if (byStatus) return byStatus;
    }
  }

  if (typeof err === 'object' && err.message && typeof err.message === 'string') {
    const m = err.message.trim();
    if (m && !looksLikeHtml(m) && !looksLikeTechnicalServerMessage(m)) {
      return m;
    }
  }

  return messageForHttpStatus(httpStatus) || genericMessage();
}
