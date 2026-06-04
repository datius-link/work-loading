import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";

export default function OthersScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Others</Text>

        <TouchableOpacity style={styles.row}>
          <AppIcon name="history" size={18} color={theme.colors.primary} />
          <Text style={styles.text}>My Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate("ProviderSettings", {
              from: "Others",
            })
          }
        >
          <AppIcon name="settings" size={18} color={theme.colors.primary} />
          <Text style={styles.text}>Settings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row}>
          <AppIcon name="help" size={18} color={theme.colors.textMuted} />
          <Text style={[styles.text, { color: theme.colors.textMuted }]}>
            Help & Support
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.primary,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  divider: {
    height: 20,
  },
});
