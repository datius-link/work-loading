import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../icons/AppIcon";
import Txt from "../Txt";
import { useAppTheme } from "../theme";
import { setInAppBannerListener } from "../notifications/bannerController";
import { typeTone, resolveNotificationDestination } from "../notifications/notificationRouting";
import { navigateToDestination } from "../notifications/pushNotifications";

const AUTO_DISMISS_MS = 4500;

// The one custom "in-app popup/banner" the app shows for a push notification
// received while foregrounded (see pushNotifications.js#handleReceived).
// Mounted once in App.js, above the navigator, and driven entirely through
// bannerController's pub/sub so non-React code can trigger it.
export default function NotificationBanner() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [item, setItem] = useState(null);
  const translateY = useRef(new Animated.Value(-140)).current;
  const dismissTimer = useRef(null);

  useEffect(() => {
    const unsubscribe = setInAppBannerListener((nextItem) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setItem(nextItem);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!item) return undefined;

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
    }).start();

    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  function dismiss() {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setItem(null));
  }

  function handlePress() {
    const destination = resolveNotificationDestination(item, { fallbackToAlerts: true });
    dismiss();
    navigateToDestination(destination);
  }

  if (!item) return null;
  const tone = typeTone(item);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 6, transform: [{ translateY }] }]}
    >
      <TouchableOpacity style={styles.banner} activeOpacity={0.9} onPress={handlePress}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone.color}22`, borderColor: tone.color }]}>
          <AppIcon name={tone.icon} size={18} color={tone.color} />
        </View>
        <View style={styles.textWrap}>
          <Txt en={item.title || "Work Loading"} sw={item.title || "Work Loading"} style={styles.title} numberOfLines={1} />
          {item.body ? (
            <Txt en={item.body} sw={item.body} style={styles.body} numberOfLines={2} />
          ) : null}
        </View>
        <TouchableOpacity hitSlop={10} onPress={dismiss} style={styles.closeBtn}>
          <AppIcon name="close" size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 10,
      right: 10,
      zIndex: 1100,
    },
    banner: {
      minHeight: 64,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    textWrap: { flex: 1, minWidth: 0 },
    title: { color: theme.colors.text, fontSize: 13.5, fontWeight: "900" },
    body: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
    closeBtn: { padding: 4 },
  });
