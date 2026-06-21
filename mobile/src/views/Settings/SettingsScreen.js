import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../../icons/AppIcon";
import Txt from "../../Txt";
import { useAppTheme } from "../../theme";

export default function SettingsScreen({ titleEn, titleSw, onBack, children, footer }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={8}>
          <AppIcon name="arrowLeft" size={19} color={theme.colors.text} />
        </TouchableOpacity>
        <Txt en={titleEn} sw={titleSw} style={styles.title} />
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 28 }]}
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

export function SettingDivider() {
  const { theme } = useAppTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}

const createStyles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      minHeight: 48,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    headerSpacer: { width: 38 },
    title: { flex: 1, textAlign: "center", color: theme.colors.text, fontSize: 18, fontWeight: "900" },
    content: { padding: 14, gap: 10 },
  });
