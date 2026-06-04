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
import Txt from "../../Txt";
import { useLanguage } from "../../LanguageContext";
import { useAppTheme } from "../../theme";

export default function ProviderSettings({ navigation, route }) {
  const from = route.params?.from || "Others";
  const { language, toggleLanguage } = useLanguage();
  const { theme, mode, toggleTheme } = useAppTheme();
  const styles = createStyles(theme);

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
        <Txt en="Settings" sw="Mipangilio" style={styles.title} />
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.body}>
        <TouchableOpacity style={styles.row} onPress={toggleLanguage}>
          <AppIcon name="tag" size={18} color={theme.colors.primary} />
          <View style={styles.rowTextWrap}>
            <Txt en="Language" sw="Lugha" style={styles.text} />
            <Text style={styles.subText}>{language === "sw" ? "Kiswahili" : "English"}</Text>
          </View>
          <Text style={styles.pill}>{language.toUpperCase()}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={toggleTheme}>
          <AppIcon name="settings" size={18} color={theme.colors.accent} />
          <View style={styles.rowTextWrap}>
            <Txt en="Appearance" sw="Muonekano" style={styles.text} />
            <Txt en={mode === "dark" ? "Dark mode" : "Light mode"} sw={mode === "dark" ? "Giza" : "Mwanga"} style={styles.subText} />
          </View>
          <Text style={[styles.pill, styles.bluePill]}>{mode === "dark" ? "DARK" : "LIGHT"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <AppIcon name="bell" size={18} color={theme.colors.primary} />
          <Txt en="Notifications" sw="Arifa" style={styles.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <AppIcon name="lock" size={18} color={theme.colors.primary} />
          <Txt en="Security" sw="Usalama" style={styles.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <AppIcon name="userSlash" size={18} color={theme.colors.danger} />
          <Text style={[styles.text, { color: theme.colors.danger }]}>
            <Txt en="Deactivate Account" sw="Zima akaunti" />
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <AppIcon name="logout" size={18} color={theme.colors.danger} />
          <Txt en="Logout" sw="Ondoka" style={[styles.text, { color: theme.colors.danger }]} />
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
  rowTextWrap: {
    flex: 1,
  },
  subText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },
  pill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
  },
  bluePill: {
    backgroundColor: theme.colors.accentSoft,
    color: theme.colors.accent,
  },
});
