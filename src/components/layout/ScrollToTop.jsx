import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll when the route changes (window + app <main> scroller).
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelector('[data-app-scroll-main]')?.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
