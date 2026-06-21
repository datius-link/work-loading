import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import AppIcon from "../icons/AppIcon";
import Txt from "../Txt";
import { useAppTheme } from "../theme";

export default function CachedDataNotice({ visible }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!visible) return null;
  return (
    <View style={styles.notice}>
      <AppIcon name="history" size={15} color={theme.colors.warning} />
      <Txt
        en="Showing saved data. Some information may be outdated."
        sw="Unaona taarifa zilizohifadhiwa. Baadhi zinaweza kuwa za zamani."
        style={styles.text}
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    notice: {
      marginHorizontal: 14,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.colors.warning + "66",
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    text: { flex: 1, color: theme.colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  });
