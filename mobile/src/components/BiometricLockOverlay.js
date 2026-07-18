import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import AppIcon from "../icons/AppIcon";
import Txt from "../Txt";
import { useAppTheme } from "../theme";
import { getUserSession, clearUserSession } from "../utils/userSession";
import {
  biometricLabel,
  isBiometricBoundToProfile,
  promptBiometricUnlock,
} from "../utils/biometricAuth";
import { subscribeAppLock } from "../utils/appLock";
import { getDeviceId } from "../utils/deviceId";
import { viewerRequest } from "../api/api";

/**
 * A lightweight app-lock gate: if the user has opted in to biometric login
 * (Settings > Change Password area) AND they're re-opening the app with an
 * existing session already saved, require a fresh Face ID / fingerprint
 * match before the rest of the app is usable. This does not replace the
 * original password login - it protects an already-authenticated session
 * sitting on the device, the same way WhatsApp/banking apps lock behind
 * biometrics on relaunch.
 */
// Brief trips away from "active" — the OS permission dialog before a photo
// picker, the picker/camera UI itself, a share sheet, a quick peek at
// another app or the notification shade — all flip AppState through
// inactive/background and back. Re-locking behind biometrics on every one of
// these was the reported bug ("kila... nikitoka hata kwenye kutafuta picha
// ku-upload inaleta biometrics"). Only re-lock once the app has genuinely
// been away for a while, the same way most banking/chat apps grace a short
// absence instead of challenging on every blink.
const RELOCK_GRACE_MS = 90 * 1000;

export default function BiometricLockOverlay() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState("Face ID");
  const [checking, setChecking] = useState(false);
  const appState = useRef(AppState.currentState);
  const leftActiveAt = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      const session = await getUserSession();
      const profileUuid = session?.profile?.uuid || session?.user?.uuid || null;
      const [enabled, bioLabel] = await Promise.all([
        isBiometricBoundToProfile(profileUuid),
        biometricLabel(),
      ]);
      if (cancelled) return;
      setLabel(bioLabel);
      if (session?.isLoggedIn && enabled) {
        setLocked(true);
        attemptUnlock();
      } else {
        setLocked(false);
      }
    };

    // Check on cold start...
    evaluate();

    // ...and every time the app returns to the foreground after a genuine
    // absence. Without this, simply backgrounding Work Loading (not force-quitting
    // it) and reopening it later would skip the biometric check entirely,
    // since this component only mounts once per app process — defeating the
    // point of an app lock. Short round-trips (image/camera picker, share
    // sheet, a quick glance at another app) are graced instead of re-locking.
    const subscription = AppState.addEventListener("change", (nextState) => {
      const cameFromBackground = /inactive|background/.test(appState.current);
      const goingBackground = /inactive|background/.test(nextState);

      if (goingBackground && !cameFromBackground) {
        leftActiveAt.current = Date.now();
      }

      if (nextState === "active" && cameFromBackground) {
        const awayMs = leftActiveAt.current ? Date.now() - leftActiveAt.current : RELOCK_GRACE_MS + 1;
        leftActiveAt.current = null;
        if (awayMs >= RELOCK_GRACE_MS) evaluate();
      }

      appState.current = nextState;
    });

    // Settings' Logout button triggers this directly for the biometric-bound
    // account, so pressing Logout re-locks instead of destroying the session.
    const unsubscribeAppLock = subscribeAppLock(() => {
      evaluate();
    });

    return () => {
      cancelled = true;
      subscription.remove();
      unsubscribeAppLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attemptUnlock = async () => {
    setChecking(true);
    const ok = await promptBiometricUnlock("Unlock Work Loading");
    setChecking(false);
    if (ok) setLocked(false);
  };

  if (!locked) return null;

  return (
    <Modal visible transparent={false} animationType="none">
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.iconWrap}>
          <AppIcon name="lock" size={30} color={theme.colors.primary} />
        </View>
        <Txt en="Work Loading is locked" sw="Work Loading imefungwa" style={styles.title} />
        <Txt
          en={`Use ${label} to continue.`}
          sw={`Tumia ${label} kuendelea.`}
          style={styles.subtitle}
        />
        <TouchableOpacity style={styles.unlockBtn} onPress={attemptUnlock} disabled={checking}>
          <AppIcon name="fingerprint" size={18} color={theme.colors.onPrimary} />
          <Txt en={`Unlock with ${label}`} sw={`Fungua kwa ${label}`} style={styles.unlockText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            // Full logout, unlike Settings' regular Logout for this same
            // account: wipes the session AND revokes biometric trust (both
            // locally and, best-effort, on the server) — matches "Not you?"
            // meaning someone else may now use this device.
            try {
              const deviceId = await getDeviceId();
              await viewerRequest("post", "/devices/untrust", { device_id: deviceId });
            } catch (_err) {
              // ignore — best-effort
            }
            await clearUserSession();
            setLocked(false);
          }}
        >
          <Txt en="Not you? Log out" sw="Si wewe? Toka" style={styles.logoutText} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, marginBottom: 18 },
    title: { fontSize: 20, fontWeight: "900", color: theme.colors.text },
    subtitle: { marginTop: 6, fontSize: 13, color: theme.colors.textMuted, textAlign: "center" },
    unlockBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 28, minHeight: 50, paddingHorizontal: 22, borderRadius: 14, backgroundColor: theme.colors.primary },
    unlockText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: "900" },
    logoutBtn: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 8 },
    logoutText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  });
