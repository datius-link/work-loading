// Tiny pub/sub so any screen (Settings' Logout button) can tell
// BiometricLockOverlay "re-lock right now" without tearing down the session —
// this is what makes "Logout" a soft lock for the biometric-bound account
// instead of a full sign-out, per the security design: only ONE account can
// be biometric-active on a device, and that account's normal Logout should
// behave like re-locking the app, not destroying its credentials.
const listeners = new Set();

export function subscribeAppLock(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function triggerAppLock() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_err) {
      // ignore
    }
  });
}
