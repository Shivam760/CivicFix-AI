import { useSyncExternalStore } from 'react';

/**
 * useMediaQuery
 * True while the CSS media query matches, e.g. useMediaQuery('(min-width: 1024px)').
 * Re-renders when it starts or stops matching (window resized, phone rotated).
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false, // no window (server render): assume a small screen
  );
}

export default useMediaQuery;
