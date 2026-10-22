import { useMemo, useSyncExternalStore } from 'react';
import { authStorage, USER_CHANGED_EVENT } from '../services/apiClient';

function subscribe(onChange) {
  window.addEventListener(USER_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(USER_CHANGED_EVENT, onChange);
}

/**
 * useCurrentUser
 * The signed-in user (as stored after GET /auth/me), or null. Components using
 * it redraw when the stored user changes, e.g. the sidebar after a name change.
 */
export function useCurrentUser() {
  // The stored JSON text is the snapshot: React compares strings, not objects.
  const raw = useSyncExternalStore(subscribe, () => authStorage.getUserSnapshot(), () => null);
  return useMemo(() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);
}

export default useCurrentUser;
