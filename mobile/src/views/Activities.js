import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../theme";

export default function Activities() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Activities</Text>
          <Text style={styles.subtitle}>
            Alerts, requests, and messages will appear here.
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: theme.colors.bg,
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 8,
      color: theme.colors.textSecondary,
    },
  });
