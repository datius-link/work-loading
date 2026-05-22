import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ExploreTab from "./home/ExploreTab";
import LanguageSwitch from "../LanguageSwitch";
import Txt from "../Txt";
import { theme } from "../theme";
import AppIcon from "../icons/AppIcon";

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}>
          <AppIcon name="logo" size={34} color={theme.colors.primary} />
          <Text style={styles.logo}>e-kazi</Text>
        </View>

        <LanguageSwitch />
      </View>

      <View style={styles.subHeader}>
        <View style={styles.titleBlock}>
          <Txt en="Explore providers" sw="Gundua watoa huduma" style={styles.title} />
          <Txt
            en="Find people you can hire for real work."
            sw="Tafuta watu unaoweza kuwaajiri kwa kazi halisi."
            style={styles.subtitle}
          />
        </View>

        <TouchableOpacity
          style={styles.postJobBtn}
          onPress={() => navigation.navigate("MyJobs")}
        >
          <AppIcon name="briefcase" size={16} color={theme.colors.primary} />
          <Txt en="Post Job" sw="Post Kazi" style={styles.postJobText} />
        </TouchableOpacity>
      </View>

      <ExploreTab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  postJobBtn: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  postJobText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.primary,
  },
});
