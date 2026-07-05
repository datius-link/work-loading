// Tiny pub/sub so the non-React push notification engine (pushNotifications.js)
// can ask the single <NotificationBanner /> mounted in App.js to show itself,
// without prop drilling. Mirrors the module-level pattern already used by
// utils/userSession.js.
let listener = null;

// Returns an unsubscribe function so callers (NotificationBanner's effect)
// can clean up on unmount.
export function setInAppBannerListener(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function showInAppBanner(item) {
  if (listener) listener(item);
}
