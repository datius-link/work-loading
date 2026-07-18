import React, { useMemo, useRef } from "react";
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme";
import { useCall } from "./CallProvider";
import { formatElapsed, statusTextFor, useElapsedSeconds } from "./CallScreen";

function avatarSource(person) {
  if (person?.photo) return { uri: person.photo };
  const name = encodeURIComponent(person?.name || "Work Loading user");
  return { uri: `https://ui-avatars.com/api/?name=${name}&background=1683C7&color=fff&bold=true&rounded=true&size=256` };
}

const BUBBLE_SIZE = 60;
const TAP_THRESHOLD = 6; // px of total movement below which a release counts as a tap, not a drag

// Messenger-style "chat head" for an in-progress or still-ringing call —
// freely draggable anywhere on screen (Animated.ValueXY + PanResponder, no
// extra gesture dependency needed for a single draggable chip), tap to
// restore the full-screen call view. Lets the user keep using the rest of
// the app while a call is minimized.
export default function CallBubble({ onExpand }) {
  const call = useCall();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const elapsed = useElapsedSeconds(call?.callStartedAt);
  const { width: screenW, height: screenH } = Dimensions.get("window");

  const minX = 8;
  const minY = insets.top + 8;
  const maxX = screenW - BUBBLE_SIZE - 8;
  const maxY = screenH - BUBBLE_SIZE - insets.bottom - 90; // keep clear of tab bar

  const pan = useRef(new Animated.ValueXY({ x: maxX, y: maxY - 80 })).current;
  const dragDistance = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragDistance.current = 0;
          pan.setOffset({ x: pan.x._value, y: pan.y._value });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (evt, gesture) => {
          dragDistance.current = Math.abs(gesture.dx) + Math.abs(gesture.dy);
          Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gesture);
        },
        onPanResponderRelease: () => {
          pan.flattenOffset();
          const clampedX = Math.min(Math.max(pan.x._value, minX), maxX);
          const clampedY = Math.min(Math.max(pan.y._value, minY), maxY);
          Animated.spring(pan, { toValue: { x: clampedX, y: clampedY }, useNativeDriver: false, speed: 20 }).start();
          if (dragDistance.current < TAP_THRESHOLD) onExpand?.();
        },
      }),
    [minX, minY, maxX, maxY, onExpand, pan]
  );

  if (!call || call.callState === "idle") return null;

  const person = call.otherParty;
  const label = call.callState === "active" ? formatElapsed(elapsed) : statusTextFor(call, elapsed);
  const styles = createStyles(theme);

  return (
    <Animated.View
      style={[styles.bubble, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <Image source={avatarSource(person)} style={styles.avatar} />
      <View style={styles.pill}>
        <Text style={styles.pillText} numberOfLines={1}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    bubble: {
      position: "absolute",
      width: BUBBLE_SIZE,
      alignItems: "center",
      zIndex: 50,
    },
    avatar: {
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      borderRadius: BUBBLE_SIZE / 2,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 2.5,
      borderColor: theme.colors.primary,
    },
    pill: {
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.bgElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      maxWidth: 90,
      ...theme.shadow.soft,
    },
    pillText: { color: theme.colors.text, fontSize: 10.5, fontWeight: "800", textAlign: "center" },
  });
