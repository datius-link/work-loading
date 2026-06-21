import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import AppIcon from "./icons/AppIcon";
import { useAppTheme } from "./theme/index";

export default function ThemeSwitch() {
  const { mode, toggleTheme, theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity style={styles.wrap} onPress={toggleTheme} activeOpacity={0.85}>
      <View style={[styles.segment, mode === "light" && styles.active]}>
        <AppIcon
          name="sun"
          size={17}
          color={mode === "light" ? theme.colors.onPrimary : theme.colors.textMuted}
        />
      </View>
      <View style={[styles.segment, mode === "dark" && styles.active]}>
        <AppIcon
          name="moon"
          size={17}
          color={mode === "dark" ? theme.colors.onPrimary : theme.colors.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignSelf: "flex-end",
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 3,
    },
    segment: {
      minWidth: 42,
      minHeight: 32,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    active: {
      backgroundColor: theme.colors.primary,
    },
  });
