import { fetchS3PresignedUrl } from '../network/NetworkManager';

const resolvedCache = new Map();
const inFlight = new Map();

function isLikelyS3HttpsUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 's3.amazonaws.com') return true;
    if (h.endsWith('.amazonaws.com')) {
      if (h.startsWith('s3.') || /^s3[-.]/.test(h)) return true;
      if (h.includes('.s3.') || h.includes('.s3-')) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * From a full S3 HTTPS URL, return the object key; otherwise null (not S3 / not parseable).
 */
export function extractS3ObjectKeyFromInput(src) {
  const t = String(src ?? '').trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!isLikelyS3HttpsUrl(t)) return null;
    const h = u.hostname.toLowerCase();
    let path = u.pathname.replace(/^\/+/, '');
    if (h.startsWith('s3.') || /^s3[-.]/.test(h)) {
      const i = path.indexOf('/');
      if (i >= 0 && i < path.length - 1) return decodeURIComponent(path.slice(i + 1));
    }
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

/** Whether this `src` should be resolved via GET /s3/file/{key}. */
export function shouldResolvePresignedMediaSrc(src) {
  const t = String(src ?? '').trim();
  if (!t) return false;
  if (/^data:|^blob:/i.test(t)) return false;
  if (/picsum\.|placeholder|ui-avatars|gravatar\.com/i.test(t)) return false;
  if (isLikelyS3HttpsUrl(t)) return true;
  if (!/^https?:\/\//i.test(t)) {
    if (t.startsWith('/') || t.startsWith('//') || t.startsWith('.')) return false;
    if (/\//.test(t) && /[\w-]/.test(t)) return true;
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(t)) return true;
  }
  return false;
}

function cacheKeyFor(src) {
  return extractS3ObjectKeyFromInput(src) ?? String(src).trim();
}

/**
 * Returns a URL suitable for `<img src>` — presigned when needed, unchanged otherwise.
 */
export async function resolvePresignedMediaUrl(src) {
  const t = String(src ?? '').trim();
  if (!t) return '';
  if (!shouldResolvePresignedMediaSrc(t)) return t;
  const key = extractS3ObjectKeyFromInput(t) ?? t.replace(/^\/+/, '');
  if (!key) return t;
  if (resolvedCache.has(key)) return resolvedCache.get(key);
  if (inFlight.has(key)) {
    try {
      return await inFlight.get(key);
    } catch {
      return t;
    }
  }
  const promise = fetchS3PresignedUrl(key).then((signed) => {
    const out = signed || t;
    if (signed) resolvedCache.set(key, signed);
    return out;
  });
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}
