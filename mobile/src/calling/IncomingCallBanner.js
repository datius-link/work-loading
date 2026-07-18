import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../icons/AppIcon";
import { useAppTheme } from "../theme";
import { useCall } from "./CallProvider";

function avatarSource(person) {
  if (person?.photo) return { uri: person.photo };
  const name = encodeURIComponent(person?.name || "Work Loading user");
  return { uri: `https://ui-avatars.com/api/?name=${name}&background=1683C7&color=fff&bold=true&rounded=true&size=256` };
}

const AUTO_MINIMIZE_MS = 3000;

// A non-blocking "who's calling" strip, WhatsApp-style — slides down from
// the top as a plain absolutely-positioned View (not a Modal), so unlike the
// old fullscreen overlay it never steals touches from whatever screen is
// underneath. Left unanswered, it collapses itself into the floating bubble
// after a few seconds so it doesn't sit blocking the top of the screen
// forever, while the call keeps ringing underneath.
export default function IncomingCallBanner({ onExpand, onAutoMinimize }) {
  const call = useCall();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;

  const isIncoming = call?.callState === "incoming";

  useEffect(() => {
    if (!isIncoming) return undefined;
    translateY.setValue(-160);
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }).start();

    const timer = setTimeout(() => onAutoMinimize?.(), AUTO_MINIMIZE_MS);
    return () => clearTimeout(timer);
  }, [isIncoming, call?.callId, translateY, onAutoMinimize]);

  if (!isIncoming) return null;

  const person = call.otherParty;
  const styles = createStyles(theme);

  return (
    <Animated.View
      style={[styles.wrap, { paddingTop: insets.top + 10, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onExpand}>
        <View style={styles.headerRow}>
          <View style={styles.liveDot} />
          <Text style={styles.headerText}>Incoming Voice Call</Text>
        </View>
        <View style={styles.bodyRow}>
          <Image source={avatarSource(person)} style={styles.avatar} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{person?.name || "Work Loading user"}</Text>
            {call.jobTitle ? (
              <Text style={styles.jobTitle} numberOfLines={1}>{call.jobTitle}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={call.declineCall}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={call.acceptCall}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="phone" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      paddingHorizontal: 12,
    },
    card: {
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radius.lg,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.success },
    headerText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
    bodyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceSoft },
    name: { color: theme.colors.text, fontSize: 15, fontWeight: "900" },
    jobTitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", marginTop: 1 },
    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    declineBtn: { backgroundColor: theme.colors.danger },
    acceptBtn: { backgroundColor: theme.colors.success },
  });
