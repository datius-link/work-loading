import React, { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Txt from "../Txt";
import { useAppTheme } from "../theme";
import AppIcon from "../icons/AppIcon";

// Three message surfaces used across the app, all sharing the same red
// (error) / green (success) color language:
//   - Banner: sits inline in the screen until dismissed or replaced — for
//     form-level errors/success that the user should keep seeing.
//   - Toast: a brief splash that fades in, holds, then auto-dismisses — for
//     "it worked" confirmations that don't need to block anything.
//   - MessageModal: a blocking dialog with an explicit acknowledgement — for
//     messages the user must actively confirm before continuing.

export function Banner({ type = "error", text, style }) {
  const { theme } = useAppTheme();
  if (!text) return null;
  const isError = type === "error";
  const color = isError ? theme.colors.danger : theme.colors.success;
  const bg = isError ? theme.colors.dangerSoft : theme.colors.successSoft;
  return (
    <View style={[bannerStyles.wrap, { backgroundColor: bg, borderColor: color }, style]}>
      <AppIcon name={isError ? "warning" : "check"} size={15} color={color} />
      <Txt en={text} sw={text} style={[bannerStyles.text, { color }]} />
    </View>
  );
}

// `persistent` skips the auto-dismiss timer — the caller hides it by
// flipping `visible` off instead (used for "no connection" toasts that must
// stay up until the condition clears). `position="top"` anchors it under the
// header instead of covering the center of the screen.
export function Toast({ visible, type = "success", text, onHide, duration = 1600, persistent = false, position = "center" }) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!visible) return undefined;
    opacity.setValue(0);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    if (persistent) return undefined;
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, persistent]);

  if (!visible) return null;
  const isError = type === "error";
  const color = isError ? theme.colors.danger : theme.colors.success;
  const bg = isError ? theme.colors.dangerSoft : theme.colors.successSoft;
  return (
    <View pointerEvents="none" style={[toastStyles.overlay, position === "top" && toastStyles.overlayTop]}>
      <Animated.View style={[toastStyles.card, { backgroundColor: bg, borderColor: color, opacity, transform: [{ scale }] }]}>
        <AppIcon name={isError ? "warning" : "check"} size={18} color={color} strokeWidth={3} />
        <Txt en={text} sw={text} style={[toastStyles.text, { color }]} />
      </Animated.View>
    </View>
  );
}

export function MessageModal({ visible, type = "error", title, text, onClose, confirmLabel = "OK" }) {
  const { theme } = useAppTheme();
  const isError = type === "error";
  const color = isError ? theme.colors.danger : theme.colors.success;
  const bg = isError ? theme.colors.dangerSoft : theme.colors.successSoft;
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[modalStyles.iconWrap, { backgroundColor: bg }]}>
            <AppIcon name={isError ? "warning" : "check"} size={22} color={color} />
          </View>
          {title ? <Txt en={title} sw={title} style={[modalStyles.title, { color: theme.colors.text }]} /> : null}
          {text ? <Txt en={text} sw={text} style={[modalStyles.body, { color: theme.colors.textMuted }]} /> : null}
          <TouchableOpacity style={[modalStyles.btn, { backgroundColor: theme.colors.primary }]} onPress={onClose}>
            <Txt en={confirmLabel} sw={confirmLabel} style={[modalStyles.btnText, { color: theme.colors.onPrimary }]} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1.25,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginTop: 10,
  },
  text: { flex: 1, fontSize: 12.5, fontWeight: "700", lineHeight: 17 },
});

const toastStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  overlayTop: {
    justifyContent: "flex-start",
    paddingTop: 56,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: "86%",
  },
  text: { fontSize: 13, fontWeight: "800" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 20, alignItems: "center" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  body: { fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  btn: { marginTop: 16, minHeight: 46, minWidth: 120, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { fontSize: 14, fontWeight: "800" },
});
