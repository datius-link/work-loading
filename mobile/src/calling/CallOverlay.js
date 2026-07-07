import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../icons/AppIcon";
import { createTheme } from "../theme";
import { useCall } from "./CallProvider";

function useElapsedSeconds(startedAt) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return undefined;
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return seconds;
}

function formatElapsed(totalSeconds) {
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
  return { uri: `https://ui-avatars.com/api/?name=${name}&background=0B6B63&color=fff&bold=true&rounded=true&size=256` };
}

// Call screens read best as an immersive, always-dark surface (WhatsApp,
// Messenger, Bolt all do this regardless of the phone's own light/dark
// setting) — so this pins the app's own dark palette rather than reacting to
// the user's theme toggle, while still pulling every color from the real
// theme system instead of inventing new hex values.
const callTheme = createTheme("dark");

// Rendered once, globally, from AppShell — it appears over whatever screen
// is currently active, exactly like a WhatsApp/Bolt call screen would,
// regardless of which tab or workspace the user happens to be looking at.
export default function CallOverlay() {
  const call = useCall();
  const insets = useSafeAreaInsets();
  const [imgError, setImgError] = useState(false);
  // Called unconditionally (rules of hooks) even while idle/hidden — it's a
  // no-op until callStartedAt is set.
  const elapsed = useElapsedSeconds(call?.callStartedAt);

  const pulse = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  // Entrance: the whole card slides up + fades in the moment a call
  // appears, and the same value reverses out when it disappears, instead of
  // the screen just snapping in/out of existence.
  const enter = useRef(new Animated.Value(0)).current;
  // Crosses the status line over to its next value (e.g. "Calling…" ->
  // "01:04") instead of it jump-cutting.
  const statusFade = useRef(new Animated.Value(1)).current;
  const acceptGlow = useRef(new Animated.Value(0)).current;

  const isIncoming = call?.callState === "incoming";
  const isOutgoing = call?.callState === "outgoing";
  const isActive = call?.callState === "active";
  const isRinging = isIncoming || isOutgoing;
  const visible = !!call && call.callState !== "idle";
  // Kept mounted for the short exit-animation window even after the call
  // itself has gone idle, instead of the whole screen hard-cutting away the
  // instant callState flips (Modal + its children would otherwise unmount
  // before Animated ever gets a frame to animate the fade/slide-out).
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

  const statusText = isIncoming ? "Incoming call…" : isOutgoing ? "Calling…" : isActive ? formatElapsed(elapsed) : "";
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
      <LinearGradient colors={[callTheme.colors.primaryDark, callTheme.colors.bg, callTheme.colors.bg]} style={StyleSheet.absoluteFill} />
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
              <AppIcon name="briefcase" size={11} color={callTheme.colors.primary} />
              <Text style={styles.jobPillText} numberOfLines={1}>{call.jobTitle}</Text>
            </View>
          ) : null}
          <Animated.Text style={[styles.status, { opacity: statusFade }]}>{statusText}</Animated.Text>
          {call.error ? <Text style={styles.error}>{call.error}</Text> : null}
        </View>

        {isIncoming ? (
          <View style={styles.actionsRow}>
            <RoundButton icon="close" color={callTheme.colors.danger} label="Decline" onPress={call.declineCall} />
            <Animated.View style={{ shadowOpacity: glowShadow, shadowRadius: 18, shadowColor: callTheme.colors.success, shadowOffset: { width: 0, height: 0 } }}>
              <RoundButton icon="phone" color={callTheme.colors.success} label="Accept" onPress={call.acceptCall} pulse />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <RoundButton
              icon={call.isMuted ? "volumeOff" : "volumeUp"}
              color={call.isMuted ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)"}
              label={call.isMuted ? "Unmute" : "Mute"}
              onPress={call.toggleMute}
              active={call.isMuted}
              small
            />
            <RoundButton icon="close" color={callTheme.colors.danger} label={isOutgoing ? "Cancel" : "End"} onPress={call.endCall} />
            {call.speakerSupported ? (
              <RoundButton
                icon="volumeUp"
                color={call.isSpeakerOn ? callTheme.colors.primary : "rgba(255,255,255,0.14)"}
                label="Speaker"
                onPress={call.toggleSpeaker}
                active={call.isSpeakerOn}
                small
              />
            ) : null}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

function RoundButton({ icon, color, label, onPress, small, pulse, active }) {
  const press = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(press, { toValue: 0.88, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
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
        <AppIcon name={icon} size={small ? 18 : 26} color="#FFFFFF" />
      </Animated.View>
      <Text style={styles.buttonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 132;

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  pulseRing: {
    position: "absolute",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: callTheme.colors.primaryStrong,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: callTheme.colors.surfaceSoft,
    borderWidth: 3,
    borderColor: "rgba(61,219,196,0.55)",
  },
  name: { color: callTheme.colors.text, fontSize: 23, fontWeight: "900", textAlign: "center", paddingHorizontal: 20 },
  jobPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(61,219,196,0.12)",
    borderWidth: 1,
    borderColor: "rgba(61,219,196,0.35)",
  },
  jobPillText: { color: callTheme.colors.primary, fontSize: 11.5, fontWeight: "800" },
  status: { color: callTheme.colors.textSecondary, fontSize: 14.5, fontWeight: "700", marginTop: 4 },
  error: { color: "#F87171", fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  actionsRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 30, paddingBottom: 20 },
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
  buttonGlow: { shadowColor: callTheme.colors.success, shadowOpacity: 0.6, shadowRadius: 16 },
  buttonSmall: { width: 48, height: 48, borderRadius: 24 },
  buttonActiveRing: { borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  buttonLabel: { color: callTheme.colors.textSecondary, fontSize: 11.5, fontWeight: "800" },
});
