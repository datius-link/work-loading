import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../icons/AppIcon";
import Txt from "../Txt";
import { useAppTheme } from "../theme";
import { useNetworkStatus } from "../utils/network";

export default function NetworkBanner() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!isOffline) return null;
  return (
    <View style={[styles.banner, { top: insets.top }]} accessibilityRole="alert">
      <AppIcon name="warning" size={16} color={theme.colors.onPrimary} />
      <Txt
        en="Connection problem. Please check your internet and try again."
        sw="Kuna tatizo la mtandao. Hakikisha internet ipo kisha jaribu tena."
        style={styles.text}
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    banner: {
      position: "absolute",
      left: 10,
      right: 10,
      zIndex: 1000,
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.danger,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    text: { flex: 1, color: theme.colors.onPrimary, fontSize: 11.5, lineHeight: 16, fontWeight: "800" },
  });
