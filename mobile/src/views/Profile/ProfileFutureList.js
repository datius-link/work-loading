import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";

export default function ProfileFutureList() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const count = Number(route.params?.count || 0);

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="arrowLeft" size={19} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jobs</Text>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.body}>
        <Text style={styles.count}>{count.toLocaleString()}</Text>
        <Text style={styles.title}>Archived jobs will appear here.</Text>
        <Text style={styles.copy}>
          This screen is reserved for the full community history view.
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  body: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  count: { color: theme.colors.primary, fontSize: 42, fontWeight: "900" },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: "900", marginTop: 8, textAlign: "center" },
  copy: { color: theme.colors.textMuted, fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center", marginTop: 8 },
});
