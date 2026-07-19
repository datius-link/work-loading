import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ExploreTab from "./home/ExploreTab";
import { useAppTheme } from "../theme";
import { useLanguage } from "../LanguageContext";
import AppIcon from "../icons/AppIcon";
import EkaziLogo from "../../assets/e-kazi-logo.svg";

const T = {
  en: { tagline: "Find work nearby", notifications: "Notifications", updates: "Updates" },
  sw: { tagline: "Pata kazi karibu nawe", notifications: "Arifa", updates: "Taarifa Mpya" },
};

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { language } = useLanguage();
  const t = T[language] || T.en;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showMenu, setShowMenu] = useState(false);

  const openMenuItem = (screen) => {
    setShowMenu(false);
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <EkaziLogo width={34} height={34} />
            <View style={styles.logoDot} />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>
              Work <Text style={styles.brandNameAccent}>Loading</Text>
            </Text>
            <Text style={styles.brandTag} numberOfLines={1}>
              {t.tagline}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("SearchResults")}
            activeOpacity={0.8}
          >
            <AppIcon name="search" size={19} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.8}
          >
            <AppIcon name="moreVertical" size={19} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuCard, { top: insets.top + 60 }]}>
            <TouchableOpacity style={styles.menuRow} onPress={() => openMenuItem("Alerts")} activeOpacity={0.8}>
              <AppIcon name="bell" size={18} color={theme.colors.text} />
              <Text style={styles.menuText}>{t.notifications}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuRow} onPress={() => openMenuItem("Updates")} activeOpacity={0.8}>
              <AppIcon name="fileText" size={18} color={theme.colors.text} />
              <Text style={styles.menuText}>{t.updates}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ExploreTab navigation={navigation} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 20,
    },
    brandRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
    logoBadge: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
    },
    logoDot: {
      position: "absolute",
      top: -3,
      right: -3,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.warning,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    brandText: { flexShrink: 1, justifyContent: "center", minWidth: 0 },
    brandName: { fontSize: 18, fontWeight: "900", color: theme.colors.text, letterSpacing: 0 },
    brandNameAccent: { color: theme.colors.primaryStrong },
    brandTag: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)" },
    menuCard: {
      position: "absolute",
      right: 16,
      minWidth: 190,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 6,
      ...theme.shadow.card,
    },
    menuRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    menuText: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
    menuDivider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 10 },
  });
