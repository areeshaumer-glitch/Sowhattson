import { useEffect, useState } from 'react';
import {
  resolvePresignedMediaUrl,
  shouldResolvePresignedMediaSrc,
} from '../../utils/resolvePresignedMediaUrl';

/**
 * Renders an image; S3 / storage keys are resolved via GET /s3/file/{key} when needed.
 * Other URLs (picsum, non-S3 https, data) pass through unchanged.
 */
export function PresignedImage({
  src,
  alt = '',
  style,
  className,
  loadingStyle,
  onLoad,
  onError,
  ...rest
}) {
  const raw = src == null ? '' : String(src).trim();
  const [displaySrc, setDisplaySrc] = useState(() => {
    if (!raw) return '';
    if (!shouldResolvePresignedMediaSrc(raw)) return raw;
    return '';
  });

  useEffect(() => {
    const s = src == null ? '' : String(src).trim();
    if (!s) {
      setDisplaySrc('');
      return;
    }
    if (!shouldResolvePresignedMediaSrc(s)) {
      setDisplaySrc(s);
      return;
    }
    let cancelled = false;
    setDisplaySrc('');
    resolvePresignedMediaUrl(s).then((out) => {
      if (!cancelled) setDisplaySrc(out || s);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!raw) return null;

  if (shouldResolvePresignedMediaSrc(raw) && !displaySrc) {
    return (
      <div
        aria-hidden
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          boxSizing: 'border-box',
          ...style,
          ...loadingStyle,
        }}
      />
    );
  }

  return (
    <img
      src={displaySrc || raw}
      alt={alt}
      style={style}
      className={className}
      onLoad={onLoad}
      onError={onError}
      {...rest}
    />
  );
}
