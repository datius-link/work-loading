/**
 * AnimatedJobPipeline.js - the animated, theme-aware job pipeline progress
 * strip shown at the top of the workspace Progress tab.
 *
 * Steps: Hired -> Started -> Working -> Submission -> Completed.
 * `activeIndex` (0-4) marks the current step; everything before it is
 * "done" (filled + check, pop-in on the transition into that state),
 * the current one is "active" (pulsing ring + soft glow + gentle bounce
 * whenever it becomes active), and everything after is "upcoming". A light
 * haptic tap fires whenever activeIndex advances.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AppIcon from "../../../../icons/AppIcon";
import { useAppTheme } from "../../../../theme";

const STEPS = [
  { key: "hired", en: "Hired", sw: "Ameajiriwa", icon: "user" },
  { key: "started", en: "Started", sw: "Imeanza", icon: "play-circle" },
  { key: "working", en: "Working", sw: "Inaendelea", icon: "briefcase" },
  { key: "submitted", en: "Submission", sw: "Imewasilishwa", icon: "file-text" },
  { key: "completed", en: "Completed", sw: "Imekamilika", icon: "award" },
];

const STEP_SIZE = 38;
const RING_SIZE = STEP_SIZE + 14;
const GLOW_SIZE = STEP_SIZE + 34;

// The whole strip always fits the screen width: no horizontal scrolling.
// Steps sit in N equal-width flex columns, so the center of column i is at
// (i + 0.5) * (100/N)%. The connecting line runs between the center of the
// first and last columns, which works out to these two constants.
const EDGE_PCT = 50 / STEPS.length;
const SPAN_PCT = (100 * (STEPS.length - 1)) / STEPS.length;

function themedColors(theme) {
  return {
    bg: theme.colors.surface,
    bgSoft: theme.colors.surfaceSoft,
    primary: theme.colors.primary,
    primaryStrong: theme.colors.primaryStrong || theme.colors.primary,
    primarySoft: theme.colors.primarySoft,
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    border: theme.colors.border,
    onPrimary: theme.colors.onPrimary,
  };
}

function PulsingRing({ colors }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[st.ring, { borderColor: colors.primaryStrong, transform: [{ scale }], opacity }]}
    />
  );
}

function FloatingParticle({ delay, left, colors }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.45, 0.45, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[st.particle, { left, backgroundColor: colors.primaryStrong, opacity, transform: [{ translateY }] }]}
    />
  );
}

function Step({ step, index, activeIndex, tx, colors }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bumped = useRef(false);

  const isDone = index < activeIndex;
  const isActive = index === activeIndex;
  const isUpcoming = index > activeIndex;
  const isReached = isDone || isActive;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 90),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bumped.current) {
      bumped.current = true;
      return;
    }
    if (!isReached) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.18, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReached]);

  return (
    <Animated.View style={[st.stepWrap, { opacity, transform: [{ scale }] }]}>
      <View style={st.circleZone}>
        {isActive && <PulsingRing colors={colors} />}
        {isActive && (
          <LinearGradient
            pointerEvents="none"
            colors={[colors.primaryStrong + "55", colors.primaryStrong + "00"]}
            style={st.glow}
          />
        )}
        <View
          style={[
            st.circle,
            { backgroundColor: colors.bgSoft, borderColor: colors.border },
            isDone && { backgroundColor: colors.primary, borderColor: colors.primary },
            isActive && st.circleActive,
            isActive && {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primaryStrong,
              shadowColor: colors.primaryStrong,
            },
            isUpcoming && { backgroundColor: "transparent", borderColor: colors.border },
          ]}
        >
          <AppIcon
            name={isDone ? "check-circle" : step.icon}
            size={19}
            color={isUpcoming ? colors.textMuted : (isActive ? colors.primaryStrong : colors.onPrimary)}
          />
        </View>
      </View>
      <Text style={[st.label, { color: isReached ? colors.text : colors.textMuted }]} numberOfLines={1}>
        {tx(step.en, step.sw)}
      </Text>
    </Animated.View>
  );
}

export default function AnimatedJobPipeline({ activeIndex = 0, language = "en", disabled = false }) {
  const { theme } = useAppTheme();
  const colors = themedColors(theme);
  const tx = (en, sw) => (language === "sw" ? sw : en);
  const clampedIndex = Math.max(0, Math.min(STEPS.length - 1, activeIndex));

  const containerOpacity = useRef(new Animated.Value(0)).current;
  const lineProgress = useRef(new Animated.Value(clampedIndex)).current;
  const prevIndex = useRef(clampedIndex);
  const firstRun = useRef(true);

  useEffect(() => {
    Animated.timing(containerOpacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [containerOpacity]);

  useEffect(() => {
    Animated.timing(lineProgress, {
      toValue: clampedIndex,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!firstRun.current && prevIndex.current !== clampedIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    firstRun.current = false;
    prevIndex.current = clampedIndex;
  }, [clampedIndex, lineProgress]);

  const lineWidthPct = lineProgress.interpolate({
    inputRange: [0, STEPS.length - 1],
    outputRange: ["0%", `${SPAN_PCT}%`],
  });

  return (
    <Animated.View style={[st.card, { borderColor: colors.border, opacity: containerOpacity }, disabled && st.cardDisabled]}>
      <LinearGradient colors={[colors.bg, colors.bgSoft]} style={StyleSheet.absoluteFill} />
      <FloatingParticle delay={0} left="18%" colors={colors} />
      <FloatingParticle delay={1100} left="52%" colors={colors} />
      <FloatingParticle delay={2100} left="82%" colors={colors} />

      <View style={st.track}>
        <View style={[st.lineBg, { backgroundColor: colors.border }]} />
        <Animated.View style={[st.lineFill, { backgroundColor: colors.primaryStrong, width: lineWidthPct }]} />
        <View style={st.stepsRow}>
          {STEPS.map((step, i) => (
            <Step key={step.key} step={step} index={i} activeIndex={clampedIndex} tx={tx} colors={colors} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 22,
    paddingHorizontal: 8,
  },
  cardDisabled: { opacity: 0.5 },
  track: { justifyContent: "center" },
  lineBg: {
    position: "absolute",
    left: `${EDGE_PCT}%`,
    right: `${EDGE_PCT}%`,
    top: RING_SIZE / 2 - 1,
    height: 2,
  },
  lineFill: {
    position: "absolute",
    left: `${EDGE_PCT}%`,
    top: RING_SIZE / 2 - 1,
    height: 2,
  },
  stepsRow: { flexDirection: "row", alignItems: "flex-start" },
  stepWrap: { flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 2 },
  circleZone: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
  },
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
  },
  circle: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    borderRadius: STEP_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  circleActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  label: { fontSize: 10, fontWeight: "700", textAlign: "center" },
  particle: {
    position: "absolute",
    bottom: 14,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
