import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../icons/AppIcon";
import { useAppTheme } from "../theme";
import { useCall } from "./CallProvider";

export function useElapsedSeconds(startedAt) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return undefined;
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return seconds;
}

export function formatElapsed(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Same "real photo, else generated initials" convention used everywhere else
// in the app (WorkspaceChat, WorkspaceDetails, RequestDetails avatarUri
// helpers) — a call from a stranger with no profile_pic still gets a
// recognizable, branded avatar instead of a generic person-outline icon.
function avatarSource(person) {
  if (person?.photo) return { uri: person.photo };
  const name = encodeURIComponent(person?.name || "e-kazi user");
  return { uri: `https://ui-avatars.com/api/?name=${name}&background=1683C7&color=fff&bold=true&rounded=true&size=256` };
}

// Calling → Ringing → Connecting → Connected → Reconnecting, derived purely
// from data CallProvider already has (liveCallStatus from the Convex row,
// iceState from the peer connection) — no new backend signaling needed.
export function statusTextFor(call, elapsed) {
  if (call.callState === "incoming") return "Incoming call…";
  if (call.callState === "outgoing") return call.liveCallStatus === "ringing" ? "Ringing…" : "Calling…";
  if (call.callState === "active") {
    if (call.iceState === "disconnected") return "Reconnecting…";
    if (call.iceState === "connected" || call.iceState === "completed") return formatElapsed(elapsed);
    return "Connecting…";
  }
  return "";
}

// Rendered from CallStack only while the user has requested the full-screen
// view (as opposed to the banner or the minimized floating bubble) — this
// component owns its own <Modal>, mounting/unmounting it based on whether it
// should currently be shown, exactly like the single always-fullscreen
// overlay this replaced.
export default function CallScreen({ isFullscreenRequested, onMinimize }) {
  const call = useCall();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [imgError, setImgError] = useState(false);
  const elapsed = useElapsedSeconds(call?.callStartedAt);

  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const statusFade = useRef(new Animated.Value(1)).current;
  const acceptGlow = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(theme), [theme]);

  const isIncoming = call?.callState === "incoming";
  const isOutgoing = call?.callState === "outgoing";
  const isActive = call?.callState === "active";
  const isRinging = isIncoming || isOutgoing;
  const visible = !!call && call.callState !== "idle" && !!isFullscreenRequested;
  // Kept mounted for the short exit-animation window even after the screen
  // itself should have gone away, instead of hard-cutting the fade/slide-out
  // the instant `visible` flips.
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    setImgError(false);
  }, [call?.callId]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
    } else {
      Animated.timing(enter, { toValue: 0, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, enter]);

  useEffect(() => {
    if (!isRinging) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [isRinging, pulse]);

  // A slow, subtle "breathing" scale on the avatar itself while ringing —
  // separate from the expanding pulse ring — so an incoming call reads as
  // alive even before the user focuses on the ring animation.
  useEffect(() => {
    if (!isRinging) {
      breathe.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRinging, breathe]);

  // The green Accept button gets its own glow pulse, independent of the
  // ring animation, so it visibly invites a tap rather than just sitting
  // there looking like any other button.
  useEffect(() => {
    if (!isIncoming) {
      acceptGlow.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(acceptGlow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(acceptGlow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isIncoming, acceptGlow]);

  const statusText = call ? statusTextFor(call, elapsed) : "";
  const isReconnecting = isActive && call?.iceState === "disconnected";
  const prevStatusText = useRef(statusText);
  useEffect(() => {
    if (prevStatusText.current === statusText) return;
    prevStatusText.current = statusText;
    statusFade.setValue(0);
    Animated.timing(statusFade, { toValue: 1, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [statusText, statusFade]);

  if (!call || !shouldRender) return null;

  const person = call.otherParty;
  const showRealPhoto = !!person?.photo && !imgError;
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.35, 0.08, 0] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const cardTranslate = enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const glowShadow = acceptGlow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <LinearGradient colors={[theme.colors.primaryDark, theme.colors.bg, theme.colors.bg]} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          styles.safe,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            opacity: enter,
            transform: [{ translateY: cardTranslate }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.minimizeButton, { top: insets.top + 8 }]}
          onPress={onMinimize}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={{ transform: [{ rotate: "90deg" }] }}>
            <AppIcon name="chevron-right" size={18} color={theme.colors.text} />
          </View>
        </TouchableOpacity>

        <View style={styles.center}>
          <Animated.View style={[styles.avatarWrap, { transform: [{ scale: breatheScale }] }]}>
            <Animated.View style={[styles.pulseRing, { opacity: isRinging ? ringOpacity : 0, transform: [{ scale: ringScale }] }]} />
            {showRealPhoto ? (
              <Image source={avatarSource(person)} style={styles.avatarImage} onError={() => setImgError(true)} />
            ) : (
              <Image source={avatarSource({ ...person, photo: null })} style={styles.avatarImage} />
            )}
          </Animated.View>
          <Text style={styles.name} numberOfLines={1}>{person?.name || "e-kazi user"}</Text>
          {call.jobTitle ? (
            <View style={styles.jobPill}>
              <AppIcon name="briefcase" size={11} color={theme.colors.primaryStrong} />
              <Text style={styles.jobPillText} numberOfLines={1}>{call.jobTitle}</Text>
            </View>
          ) : null}
          <Animated.Text style={[styles.status, isReconnecting && styles.statusWarning, { opacity: statusFade }]}>{statusText}</Animated.Text>
          {call.error ? <Text style={styles.error}>{call.error}</Text> : null}
        </View>

        {isIncoming ? (
          <View style={styles.actionsRow}>
            <RoundButton theme={theme} icon="close" color={theme.colors.danger} label="Decline" onPress={call.declineCall} />
            <Animated.View style={{ shadowOpacity: glowShadow, shadowRadius: 18, shadowColor: theme.colors.success, shadowOffset: { width: 0, height: 0 } }}>
              <RoundButton theme={theme} icon="phone" color={theme.colors.success} label="Accept" onPress={call.acceptCall} pulse />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <RoundButton
              theme={theme}
              icon={call.isMuted ? "volumeOff" : "volumeUp"}
              color={call.isMuted ? theme.colors.surfaceSoft : "rgba(120,120,120,0.18)"}
              label={call.isMuted ? "Unmute" : "Mute"}
              onPress={call.toggleMute}
              active={call.isMuted}
              small
            />
            <RoundButton theme={theme} icon="close" color={theme.colors.danger} label={isOutgoing ? "Cancel" : "End"} onPress={call.endCall} />
            {call.speakerSupported ? (
              <RoundButton
                theme={theme}
                icon="volumeUp"
                color={call.isSpeakerOn ? theme.colors.primary : "rgba(120,120,120,0.18)"}
                label="Speaker"
                onPress={call.toggleSpeaker}
                active={call.isSpeakerOn}
                small
              />
            ) : null}
            {call.bluetoothSupported ? (
              <RoundButton
                theme={theme}
                icon="bluetooth"
                color={call.isBluetoothOn ? theme.colors.primary : "rgba(120,120,120,0.18)"}
                label="Bluetooth"
                onPress={call.toggleBluetooth}
                active={call.isBluetoothOn}
                small
              />
            ) : null}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

function RoundButton({ theme, icon, color, label, onPress, small, pulse, active }) {
  const press = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(press, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity
      style={styles.buttonWrap}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.85}
    >
      <Animated.View
        style={[
          styles.button,
          small && styles.buttonSmall,
          pulse && styles.buttonGlow,
          active && styles.buttonActiveRing,
          { backgroundColor: color, transform: [{ scale: press }] },
        ]}
      >
        <AppIcon name={icon} size={small ? 18 : 26} color={small && !active ? theme.colors.text : theme.colors.onPrimary} />
      </Animated.View>
      <Text style={styles.buttonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 132;

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
    minimizeButton: {
      position: "absolute",
      left: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(120,120,120,0.18)",
      zIndex: 2,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    pulseRing: {
      position: "absolute",
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.colors.primaryStrong,
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 3,
      borderColor: "rgba(22,131,199,0.55)",
    },
    name: { color: theme.colors.text, fontSize: 23, fontWeight: "900", textAlign: "center", paddingHorizontal: 20 },
    jobPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: "82%",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: "rgba(22,131,199,0.12)",
      borderWidth: 1,
      borderColor: "rgba(22,131,199,0.35)",
    },
    jobPillText: { color: theme.colors.primaryStrong, fontSize: 11.5, fontWeight: "800" },
    status: { color: theme.colors.textSecondary, fontSize: 14.5, fontWeight: "700", marginTop: 4 },
    statusWarning: { color: theme.colors.warning },
    error: { color: theme.colors.danger, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
    actionsRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 24, paddingBottom: 20, flexWrap: "wrap" },
    buttonWrap: { alignItems: "center", gap: 8 },
    button: {
      width: 66,
      height: 66,
      borderRadius: 33,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    buttonGlow: { shadowColor: theme.colors.success, shadowOpacity: 0.6, shadowRadius: 16 },
    buttonSmall: { width: 48, height: 48, borderRadius: 24 },
    buttonActiveRing: { borderWidth: 2, borderColor: theme.colors.text },
    buttonLabel: { color: theme.colors.textSecondary, fontSize: 11.5, fontWeight: "800" },
  });
