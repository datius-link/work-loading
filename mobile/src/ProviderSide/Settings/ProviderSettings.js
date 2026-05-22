import React from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppIcon from "../../icons/AppIcon";
import { theme } from "../../theme";

export default function ProviderSettings({ navigation, route }) {
  const from = route.params?.from || "Others";

  const handleBack = () => {
    navigation.replace("ProviderTabs", {
      screen: from === "MyProfile" ? "MyProfile" : "Others",
    });
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              "token",
              "verifyToken",
              "pendingUuid",
              "resetPasswordToken",
              "role",
              "user",
              "provider",
            ]);

            navigation.reset({
              index: 0,
              routes: [{ name: "AuthLoading" }],
            });
          } catch (e) {
            console.log("Logout error:", e);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <AppIcon name="arrowLeft" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.body}>
        <TouchableOpacity style={styles.row}>
          <AppIcon name="bell" size={18} color={theme.colors.primary} />
          <Text style={styles.text}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <AppIcon name="lock" size={18} color={theme.colors.primary} />
          <Text style={styles.text}>Security</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <AppIcon name="userSlash" size={18} color={theme.colors.danger} />
          <Text style={[styles.text, { color: theme.colors.danger }]}>
            Deactivate Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <AppIcon name="logout" size={18} color={theme.colors.danger} />
          <Text style={[styles.text, { color: theme.colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  body: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
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
});
